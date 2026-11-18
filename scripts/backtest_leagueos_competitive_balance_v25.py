"""LeagueOS V25: leakage-controlled retrospective strength validation.
Input: read-only local SVHL archive SQLite, NEVER copied into public repo.
Public output contains aggregates only (no individual historical game/player rows).
Every prediction is made BEFORE the corresponding observed game is added to ratings.

This assesses forecast *discrimination/calibration*, not causal proof that
automatically changing divisions would prevent blowouts.
"""
from __future__ import annotations
import collections,datetime,hashlib,json,math,os,random,sqlite3,sys
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
W=ROOT/"widgets"
ARCH=Path(os.environ.get("LEAGUEOS_V25_PRIVATE_ARCHIVE_DB",""))
OUT=W/"leagueos-competitive-balance-backtest-v25.json"
SCHEMA="bruttech-leagueos-historic-competitive-balance-validation/v25"

def need(cond, message):
 if not cond:raise ValueError("V25_BACKTEST_HOLD:"+message)
def predict_elo(ra,rb):
 return 1/(1+10**((rb-ra)/400))
def clip(p):
 return max(.04,min(.96,p))
def bucket(p):
 if p<.20 or p>.80:return "STRONG_MISMATCH_FORECAST"
 if p<.35 or p>.65:return "MODERATE_MISMATCH_FORECAST"
 return "BALANCED_MATCHUP_FORECAST"
def m(x):
 return round(x,4) if x is not None else None
def validate_game(row):
 return (row["confirmation"]=="RECIPROCAL_TEAM_PAGE_MATCH" and
  row["source_rows"]==2 and row["home_team_id"]!=row["away_team_id"] and
  isinstance(row["home_goals"],int) and isinstance(row["away_goals"],int) and
  row["home_goals"]>=0 and row["away_goals"]>=0 and
  row["home_goals"]+row["away_goals"]>0 and
  row["date_local"] and row["start_local"])
def group_summary(rows):
 n=len(rows)
 if not n:return {"games":0}
 y=sum(r["score"] for r in rows)
 blow=sum(r["blowout5"] for r in rows)
 baseline=sum((r["score"]-.5)**2 for r in rows)/n
 record=sum((r["score"]-r["recordP"])**2 for r in rows)/n
 elo=sum((r["score"]-r["eloP"])**2 for r in rows)/n
 return {"games":n,"sourceBlowout5":blow,"sourceBlowoutRate":m(blow/n),
  "neutralBrier":m(baseline),"rollingRecordBrier":m(record),
  "rollingEloBrier":m(elo),"eloVsNeutralRelativeImprovementPct":m((baseline-elo)/baseline*100) if baseline else None,
  "eloVsRecordRelativeImprovementPct":m((record-elo)/record*100) if record else None,
  "homeWins":sum(r["score"]==1 for r in rows),
  "awayWins":sum(r["score"]==0 for r in rows),
  "ties":sum(r["score"]==.5 for r in rows)}
def main():
 need(ARCH.is_file() and ARCH.stat().st_size>10_000_000,"Archive database inaccessible")
 con=sqlite3.connect(f"file:{ARCH.as_posix()}?mode=ro",uri=True)
 con.row_factory=sqlite3.Row
 try:
  need(con.execute("pragma quick_check").fetchone()[0]=="ok","Archive failed quick_check")
  rel=con.execute("select release_id from scope_release limit 1").fetchone()
  need(rel and rel[0]=="W2011_12_AND_LATER_V1","Unknown source release")
  meta={r["league_id"]:(r["night"],r["cycle"],r["season"]) for r in con.execute(
   "select league_id,night,cycle,season from league_seasons")}
  observed=[r for r in con.execute("select * from reconciled_game_results order by league_id,date_local,start_local,game_id")]
  need(len(observed)==20730,"Archive game count has changed; hold backtest rebase")
  leagues=collections.defaultdict(list)
  for row in observed:
   need(validate_game(row),"Archive contains an unqualified result "+str(row["game_id"]))
   need(row["league_id"] in meta,"Missing league season metadata")
   leagues[row["league_id"]].append(row)
  all_eval=[];total_updated=0;rejected=collections.Counter()
  for lid,games in leagues.items():
   first=datetime.date.fromisoformat(games[0]["date_local"])
   strength=collections.defaultdict(lambda:1500.0)
   rec=collections.defaultdict(lambda:{"gp":0,"wins":0.0})
   for game in games:
    home=game["home_team_id"];away=game["away_team_id"]
    p=clip(predict_elo(strength[home],strength[away]))
    hs=(rec[home]["wins"]+2)/(rec[home]["gp"]+4)
    as_=(rec[away]["wins"]+2)/(rec[away]["gp"]+4)
    rp=clip(.5+(hs-as_))
    diff=game["home_goals"]-game["away_goals"]
    score=1.0 if diff>0 else 0.0 if diff<0 else .5
    elapsed=(datetime.date.fromisoformat(game["date_local"])-first).days
    # Make prediction before new result is incorporated. Approximate review after
    # 5 calendar weeks, NOT proof of the official SVHL week number.
    qualifies=elapsed>=35 and rec[home]["gp"]>=3 and rec[away]["gp"]>=3
    if qualifies:
     all_eval.append({
      "leagueId":lid,"night":meta[lid][0],"cycle":meta[lid][1],
      "seasonLabel":meta[lid][2],
      "postOpeningDay35":True,
      "score":score,"blowout5":abs(diff)>=5,
      "goalDifference":abs(diff),
      "recordP":rp,"eloP":p,
      "risk":bucket(p)})
    else:
     rejected["NOT_YET_POST_WEEK5_PROXY_OR_INSUFFICIENT_PRIOR_GAMES"]+=1
    k=22*(1+min(abs(diff),5)*.06)
    move=k*(score-p)
    strength[home]+=move;strength[away]-=move
    rec[home]["gp"]+=1;rec[away]["gp"]+=1
    rec[home]["wins"]+=score;rec[away]["wins"]+=(1-score)
    total_updated+=1
  need(total_updated==len(observed) and len(all_eval)>8000,"Backtest coverage too small")
  byBucket={k:group_summary([g for g in all_eval if g["risk"]==k]) for k in [
   "BALANCED_MATCHUP_FORECAST","MODERATE_MISMATCH_FORECAST","STRONG_MISMATCH_FORECAST"]}
  byNight={k:group_summary([g for g in all_eval if g["night"]==k]) for k in sorted(set(g["night"] for g in all_eval))}
  byCycle={k:group_summary([g for g in all_eval if g["cycle"]==k]) for k in sorted(set(g["cycle"] for g in all_eval))}
  # Hold a later calendar season to describe whether a ranking generalizes over time.
  years=[]
  for g in all_eval:
   t=str(g["seasonLabel"])
   import re
   match=re.search(r"(20\d{2})",t)
   years.append(int(match.group(1)) if match else 0)
  latest=[g for g,year in zip(all_eval,years) if year>=2023]
  historic=[g for g,year in zip(all_eval,years) if 2011<=year<2023]
  byEra={"2011_2022":group_summary(historic),"2023_2026":group_summary(latest)}
  balanced=byBucket["BALANCED_MATCHUP_FORECAST"]
  moderate=byBucket["MODERATE_MISMATCH_FORECAST"]
  strong=byBucket["STRONG_MISMATCH_FORECAST"]
  moderateGap=100*(moderate["sourceBlowoutRate"]-balanced["sourceBlowoutRate"])
  observedRiskGap=(strong["sourceBlowoutRate"]-balanced["sourceBlowoutRate"])*100 if strong.get("games") and balanced.get("games") else None
  # League-season cluster bootstrap. Games within one league season are not independent.
  grouped=collections.defaultdict(lambda:collections.Counter())
  for g in all_eval:
   q=grouped[g["leagueId"]]
   label="moderate" if g["risk"]=="MODERATE_MISMATCH_FORECAST" else ("balanced" if g["risk"]=="BALANCED_MATCHUP_FORECAST" else None)
   if label:
    q[label+"N"]+=1
    q[label+"B"]+=int(g["blowout5"])
  seed=random.Random(250117);ids=sorted(grouped)
  samples=[]
  for _ in range(1000):
   sums=collections.Counter()
   for _ in ids:
    sampled=grouped[seed.choice(ids)]
    sums.update(sampled)
   if sums["balancedN"]>=100 and sums["moderateN"]>=30:
    samples.append(100*(sums["moderateB"]/sums["moderateN"]-
                        sums["balancedB"]/sums["balancedN"]))
  samples.sort()
  need(len(samples)>=950,"Not enough bootstrap seasons support risk gap estimate")
  interval=[round(samples[int((len(samples)-1)*.025)],2),
            round(samples[int((len(samples)-1)*.975)],2)]
  allSummary=group_summary(all_eval)
  out={
   "schema":SCHEMA,"generatedUtc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
   "status":"RETROSPECTIVE_PREQUENTIAL_ELO_CALIBRATION_NOT_CAUSAL_DIVISION_EFFECT",
   "sourceAuthority":"Source-validated read-only local reciprocal public SVHL archive",
   "sourceArchiveSHA256":hashlib.sha256(ARCH.read_bytes()).hexdigest(),
   "noGameLevelRowsPublished":True,"noPlayerIDsPublished":True,
   "noOfficialLeagueChanges":True,
   "coverage":{"sourceGames":len(observed),"leagueSeasons":len(leagues),
     "uniqueNights":sorted(set(x[0] for x in meta.values())),
     "eligiblePost35DayGames":len(all_eval),"excludedEarlyOrInsufficientPrior":sum(rejected.values()),
     "archiveEarliest":min(g["date_local"] for g in observed),
     "archiveLatest":max(g["date_local"] for g in observed),
     "blowoutDefinition":"Absolute certified final goal margin >= 5"},
   "methods":{
     "predictionTiming":"Before each observed game, update after result; no final-season standings or same-season end-of-year roster stats used in prediction",
     "weekFiveProxy":"At least 35 calendar days from first recorded game in that league season and each team with >=3 previous completed games; NOT verified official Week 5",
     "neutral":"P(home win)=0.5, ties encoded as 0.5 actual score",
     "rollingRecord":"Laplace-shrunk cumulative prior team W plus half ties, translated to home-away expected result",
     "rollingElo":"Game-sequential Elo 1500 start, K22 with bounded prior observed score-margin factor 1.0–1.30; no venue prior",
     "riskBuckets":"Balanced 35–65%; moderate 20–35% or 65–80%; strong mismatch under 20% or over 80%; internal predictive labels",
     "brier":"Mean squared error on 0/0.5/1 result share; not a rigorous 3-class win/draw/loss proper score",
     "causalWarning":"Observational selection, opponent/schedule dependence and unequal team composition. Lower observed blowout rate for model-balanced matches is NOT proof a division policy causes fewer blowouts.",
     "playerInput":"No historical player/team roster information enters this backtest, avoiding end-of-season leakage; separate V25 roster-scenario additive accuracy remains UNVALIDATED",
     "uncertainty":"1000 fixed-seed bootstrap resamples of whole league seasons for the moderate-minus-balanced blowout association; NOT causal inference; suppress strong-mismatch generalization when n < 50"},
   "overall":allSummary,"riskBuckets":byBucket,"nightSummaries":byNight,"cycleSummaries":byCycle,"eraSummaries":byEra,
   "moderateVsBalancedObservedBlowoutGapPP":round(moderateGap,2),
   "moderateVsBalancedLeagueSeasonClusterBootstrap95PP":interval,
   "strongMismatchBucketSampleSufficient":strong["games"]>=50,
   "observedBlowoutRateDifferenceStrongMinusBalancedPP":round(observedRiskGap,2) if observedRiskGap is not None else None,
   "deploymentGate":{
     "relativeBrierBetterThanNeutral":allSummary["rollingEloBrier"]<allSummary["neutralBrier"],
     "betterThanRollingRecordBaseline":allSummary["rollingEloBrier"]<allSummary["rollingRecordBrier"],
     "rosterScenarioPredictiveGainProven":False,
     "calibratedDivisionMoveBenefitProven":False,
     "officialLeagueDivisionOptimizationApproved":False,
     "allowedClaim":"Historical source-tested competitive risk indicator; NOT guaranteed to reduce blowouts or infer cross-night approved tiers."}}
  OUT.write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
  print(json.dumps({"pass":"V25_HISTORICAL_PREQUENTIAL_BACKTEST_COMPLETED",
    "coverage":out["coverage"],"overall":out["overall"],
    "riskBuckets":out["riskBuckets"],
    "moderateVsBalancedGapPP":out["moderateVsBalancedObservedBlowoutGapPP"],
    "clusterBootstrap95PP":out["moderateVsBalancedLeagueSeasonClusterBootstrap95PP"],
    "era":out["eraSummaries"],"deploymentGate":out["deploymentGate"]},indent=2))
 finally:con.close()
if __name__=="__main__":
 try:main()
 except Exception as e:
  print("BACKTEST_HOLD:",repr(e),file=sys.stderr);sys.exit(2)
