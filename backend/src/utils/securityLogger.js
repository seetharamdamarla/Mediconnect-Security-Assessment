const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const SECURITY_LOG = path.join(LOG_DIR, 'security.log');
const ALERT_LOG = path.join(LOG_DIR, 'alerts.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// In-memory tracker for detection rules
const failedLogins = new Map(); // IP -> { count, firstAttempt }
const FAILED_LOGIN_THRESHOLD = 5;
const FAILED_LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function formatEntry(level, category, data) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    category,
    ...data,
  }) + '\n';
}

function writeLog(entry) {
  fs.appendFileSync(SECURITY_LOG, entry);
  // Also write to stdout for visibility
  process.stdout.write(`[SECURITY] ${entry}`);
}

function writeAlert(entry) {
  fs.appendFileSync(ALERT_LOG, entry);
  process.stdout.write(`[SECURITY ALERT] ${entry}`);
}

const securityLogger = {
  // ── Authentication Events ──
  logLoginSuccess(userId, email, ip, userAgent) {
    writeLog(formatEntry('INFO', 'AUTH_LOGIN_SUCCESS', {
      userId, email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), ip, userAgent: (userAgent || '').substring(0, 100),
    }));
  },

  logLoginFailure(email, ip, reason) {
    writeLog(formatEntry('WARN', 'AUTH_LOGIN_FAILURE', {
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), ip, reason,
    }));
    // Detection rule: repeated failed logins
    this._checkFailedLoginThreshold(ip, email);
  },

  logRegistration(userId, email, role, ip) {
    writeLog(formatEntry('INFO', 'AUTH_REGISTRATION', {
      userId, email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), role, ip,
    }));
  },

  logLogout(userId, ip) {
    writeLog(formatEntry('INFO', 'AUTH_LOGOUT', { userId, ip }));
  },

  // ── Authorization Events ──
  logAuthzFailure(userId, role, resource, reason) {
    writeLog(formatEntry('WARN', 'AUTHZ_FAILURE', {
      userId, role, resource, reason,
    }));
  },

  logAccessDenied(userId, role, resource, ip) {
    writeLog(formatEntry('WARN', 'ACCESS_DENIED', {
      userId, role, resource, ip,
    }));
  },

  // ── Sensitive Data Access ──
  logSensitiveAccess(userId, role, resource, recordCount) {
    writeLog(formatEntry('INFO', 'SENSITIVE_ACCESS', {
      userId, role, resource, recordCount,
    }));
  },

  // ── AI Events ──
  logAIRequest(userId, action, inputLength) {
    writeLog(formatEntry('INFO', 'AI_REQUEST', {
      userId, action, inputLength,
    }));
  },

  logAIResponse(userId, action, severity, success) {
    writeLog(formatEntry('INFO', 'AI_RESPONSE', {
      userId, action, severity, success,
    }));
  },

  logAIInjectionAttempt(userId, action, inputSnippet) {
    writeLog(formatEntry('ALERT', 'AI_INJECTION_ATTEMPT', {
      userId, action, inputSnippet: inputSnippet.substring(0, 50),
    }));
    writeAlert(formatEntry('CRITICAL', 'AI_PROMPT_INJECTION', {
      userId, action, message: 'Potential prompt injection attempt detected',
    }));
  },

  // ── Security Violations ──
  logSecurityViolation(category, details) {
    writeLog(formatEntry('ALERT', 'SECURITY_VIOLATION', {
      category, ...details,
    }));
  },

  // ── Detection Rules ──
  _checkFailedLoginThreshold(ip, email) {
    const now = Date.now();
    const key = ip;

    if (!failedLogins.has(key)) {
      failedLogins.set(key, { count: 1, firstAttempt: now, emails: [email] });
      return;
    }

    const record = failedLogins.get(key);

    // Reset if outside window
    if (now - record.firstAttempt > FAILED_LOGIN_WINDOW_MS) {
      failedLogins.set(key, { count: 1, firstAttempt: now, emails: [email] });
      return;
    }

    record.count++;
    if (!record.emails.includes(email)) record.emails.push(email);

    if (record.count >= FAILED_LOGIN_THRESHOLD) {
      writeAlert(formatEntry('CRITICAL', 'BRUTE_FORCE_DETECTED', {
        ip,
        attemptCount: record.count,
        windowMinutes: 5,
        uniqueEmails: record.emails.length,
        message: `${record.count} failed login attempts from ${ip} in 5 minutes — possible brute-force attack`,
      }));
      // Reset counter after alert
      failedLogins.delete(key);
    }
  },
};

module.exports = securityLogger;
