# ansible/backups

latest/ holds the most recent running-config of every device (committed for Git diffing).
Reversible IOS type-7 strings (e.g. OSPF MD5 keys) are replaced with <redacted-type7> before commit;
timestamped backups keep the full configuration and are git-ignored.

