# Approved collector deployment — file-sharing hold

Founder approved collector-only deployment in this session ('yes approved conrtinue').Accepted runtime ae64a29212198fe8d474a3276827b67509575007 staged under D:\BruTTech\Products\HockeyOS\Runtime\HTOCollector\ae64a29212198fe8d474a3276827b67509575007.Each downloaded Git blob and local readback verified;manifest saved.

Activation paused existing task,verified no legacy controller/collector process,acquired existing controller byte lock,verified backups and prior hashes,and installed the minimal pinned launcher. Collector then failed atomic replacement with WinError5 Access denied.

Recovery verified:
-original collector restored SHA3a2fa340d57aa64beba027d623c147f0eb983ebab0513fc942a434282cca1ce2.
-active feed unchanged SHA90cb9f5ba237d65ab915a19ab4167f74d32e562552d562744bd5887f162983ca.
-original hourly task enabled state restored true.
-no workbook/publisher/site changes.
-private durable receipt folder D:\BruTTech\Products\HockeyOS\Collector_Deployment_Receipts\261020_9973fb9045 contains task XML,original collector,original feed,execution logs and deployment.json.

Read-only diagnosis: file not read-only;ACL permits owner/Authenticated Users modify. Windows Restart Manager identified PID22736 Node.js holding the feed. Process command identified Desktop Commander server at @wonderwhy-er/desktop-commander/dist/index.js. No process was terminated,no file handle forcibly closed,no ACL changed,no alternative non-atomic write attempted.

Disposition:DEPLOYMENT_APPROVED_BUT_NOT_ACTIVE / ORIGINAL_RUNTIME_RESTORED / FILE_SHARING_LOCK_HOLD.

Next action:release the Desktop Commander file handle through a normal restart of that connection/server,then recheck current hashes,task/process state and repeat approved controlled activation using the staged hash-verified package. Prior deployment approval persists;do not reinterpret this file-sharing failure as permission to bypass any safety block. No additional Founder deployment decision required unless scope or accepted code changes.
