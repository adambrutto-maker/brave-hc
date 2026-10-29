/* HockeyOS game-duration normalization / analytics only.
 * Verified origin: Brave H.C. Master Workbook Player Game Logs:
 * Winter equivalent = Summer G/A/GA * 32/48; Summer equivalent = Winter G/A/GA * 48/32.
 * Public Bio may consume verified derivatives. Never use these for official records,
 * awards, milestone awards, career raw totals or private coaching decisions.
 */
(function (root, factory) {
  "use strict";
  const api = Object.freeze(factory());
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.HockeyOSPerformanceNormalization = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const SCHEMA = "hockeyos-league-game-formats/v1";
  const finitePositive = value => typeof value === "number" && Number.isFinite(value) && value > 0;
  const count = value => Number.isSafeInteger(value) && value >= 0;
  const held = reason => Object.freeze({status: "HELD", reason, analyticOnly: true});
  const frozen = obj => Object.freeze(obj);

  // Formats can specify scheduled regulation game minutes or the individual period lengths,
  // or both when the totals reconcile. Overtime and variable clock rules need their own source.
  function verifiedFormat(format) {
    if (!format || format.verificationStatus !== "VERIFIED" ||
        typeof format.id !== "string" || !format.id.trim()) return held("FORMAT_NOT_VERIFIED");
    const hasMinutes = format.regulationGameMinutes !== undefined && format.regulationGameMinutes !== null;
    const hasPeriods = format.periodMinutes !== undefined && format.periodMinutes !== null;
    if (!hasMinutes && !hasPeriods) return held("DURATION_MISSING");
    if (hasMinutes && !finitePositive(format.regulationGameMinutes)) return held("INVALID_GAME_MINUTES");
    let periodSum = null;
    if (hasPeriods) {
      if (!Array.isArray(format.periodMinutes) || format.periodMinutes.length < 1 ||
          !format.periodMinutes.every(finitePositive)) return held("INVALID_PERIOD_MINUTES");
      periodSum = format.periodMinutes.reduce((sum, minutes) => sum + minutes, 0);
    }
    if (hasMinutes && hasPeriods && Math.abs(format.regulationGameMinutes - periodSum) > 1e-8) {
      return held("CONFLICTING_PERIOD_AND_GAME_MINUTES");
    }
    const minutes = hasMinutes ? format.regulationGameMinutes : periodSum;
    if (!finitePositive(minutes)) return held("INVALID_GAME_MINUTES");
    return frozen({status: "VERIFIED", id: format.id, regulationGameMinutes: minutes});
  }

  function actualSkater(row) {
    if (!row || ![row.GP, row.G, row.A, row.Pts].every(count) ||
        row.Pts !== row.G + row.A || (row.GP === 0 && row.Pts !== 0)) return held("INVALID_SKATER_ACTUALS");
    return frozen({status: "ACTUAL", analyticOnly: false,
      GP: row.GP, G: row.G, A: row.A, Pts: row.Pts,
      pointsPerGame: row.GP > 0 ? row.Pts / row.GP : null});
  }

  function actualGoalie(row) {
    if (!row || ![row.GP, row.GA].every(count) || (row.GP === 0 && row.GA !== 0))
      return held("INVALID_GOALIE_ACTUALS");
    return frozen({status: "ACTUAL", analyticOnly: false,
      GP: row.GP, GA: row.GA, goalsAgainstPerAppearance: row.GP > 0 ? row.GA / row.GP : null});
  }

  function factorBetween(sourceFormat, targetFormat) {
    const source = verifiedFormat(sourceFormat);
    if (source.status === "HELD") return source;
    const target = verifiedFormat(targetFormat);
    if (target.status === "HELD") return target;
    return frozen({
      status: "VERIFIED", sourceFormatId: source.id, targetFormatId: target.id,
      sourceRegulationGameMinutes: source.regulationGameMinutes,
      targetRegulationGameMinutes: target.regulationGameMinutes,
      factor: target.regulationGameMinutes / source.regulationGameMinutes
    });
  }

  function normalizeSkater(row, sourceFormat, targetFormat) {
    const actual = actualSkater(row);
    if (actual.status === "HELD") return actual;
    const basis = factorBetween(sourceFormat, targetFormat);
    if (basis.status === "HELD") return basis;
    const G = actual.G * basis.factor, A = actual.A * basis.factor;
    const equivalent = frozen({
      GP: actual.GP, G, A, Pts: G + A,
      pointsPerGame: actual.GP > 0 ? (G + A) / actual.GP : null
    });
    return frozen({status: "VERIFIED_EQUIVALENT", analyticOnly: true, authority: "ANALYSIS_NOT_RECORDS",
      metric: "REGULATION_DURATION_EQUIVALENT", actual, equivalent, basis});
  }

  function normalizeGoalie(row, sourceFormat, targetFormat) {
    const actual = actualGoalie(row);
    if (actual.status === "HELD") return actual;
    const basis = factorBetween(sourceFormat, targetFormat);
    if (basis.status === "HELD") return basis;
    const GA = actual.GA * basis.factor;
    // Do not normalize W/L/T/SHO, save percentage, or official GAA.
    const equivalent = frozen({
      GP: actual.GP, GA, goalsAgainstPerAppearance: actual.GP > 0 ? GA / actual.GP : null
    });
    return frozen({status: "VERIFIED_EQUIVALENT", analyticOnly: true, authority: "ANALYSIS_NOT_RECORDS",
      metric: "GOALS_AGAINST_DURATION_EQUIVALENT_ONLY", actual, equivalent, basis});
  }

  // The public career feed currently lacks independently reconciled source minutes by
  // individual season AND game type. Never infer the assignment from the season label.
  // Bind only verified season/game-type scopes, e.g. "Summer 2013::Regular Season".
  function normalizeHistorical(row, config, options) {
    if (!options || !["skater", "goalie"].includes(options.role) ||
        typeof options.seasonKey !== "string" || !options.seasonKey.trim() ||
        typeof options.gameType !== "string" || !options.gameType.trim()) return held("SCOPE_NOT_VERIFIED");
    if (!config || config.schema !== SCHEMA ||
        !config.formats || !config.seasonBindings) return held("CONFIG_INVALID");
    if (row && typeof row.Season === "string" && row.Season !== options.seasonKey)
      return held("SOURCE_SEASON_MISMATCH");
    if (row && typeof row["Game Type"] === "string" && row["Game Type"] !== options.gameType)
      return held("SOURCE_GAME_TYPE_MISMATCH");
    const binding = config.seasonBindings[options.seasonKey + "::" + options.gameType];
    if (!binding || binding.verificationStatus !== "VERIFIED" ||
        typeof binding.evidenceRef !== "string" || !binding.evidenceRef.trim() ||
        typeof binding.formatId !== "string") return held("HISTORICAL_SOURCE_FORMAT_NOT_VERIFIED");
    const source = config.formats[binding.formatId];
    const targetId = options.targetFormatId || config.defaultTargetFormatId;
    const target = config.formats[targetId];
    if (!target) return held("TARGET_FORMAT_NOT_VERIFIED");
    return options.role === "skater"
      ? normalizeSkater(row, source, target)
      : normalizeGoalie(row, source, target);
  }

  return {SCHEMA, verifiedFormat, actualSkater, actualGoalie, factorBetween,
    normalizeSkater, normalizeGoalie, normalizeHistorical};
});
