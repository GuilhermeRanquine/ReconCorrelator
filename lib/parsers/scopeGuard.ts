import { ScopeRule } from '@/types/recon';

/**
 * OPSEC Scope Guard: Validates that a host or IP matches target in-scope rules
 * and does NOT match any out-of-scope exclusions.
 */
export class ScopeGuard {
  private inScopePatterns: string[] = [];
  private outOfScopePatterns: string[] = [];
  private customRules: ScopeRule[] = [];

  constructor(inScope: string[] = [], outOfScope: string[] = [], rules: ScopeRule[] = []) {
    this.inScopePatterns = inScope.map(s => s.trim().toLowerCase()).filter(Boolean);
    this.outOfScopePatterns = outOfScope.map(s => s.trim().toLowerCase()).filter(Boolean);
    this.customRules = rules;
  }

  public isAllowed(target: string): { allowed: boolean; reason: string; matchedRule?: string } {
    if (!target) {
      return { allowed: false, reason: 'Empty target identifier' };
    }

    const cleanTarget = target.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];

    // 1. Check Out of Scope first (Blacklist precedence)
    for (const outPattern of this.outOfScopePatterns) {
      if (this.matchPattern(cleanTarget, outPattern)) {
        return {
          allowed: false,
          reason: `Violates Out-of-Scope exclusion: "${outPattern}"`,
          matchedRule: outPattern,
        };
      }
    }

    for (const rule of this.customRules.filter(r => r.isOutOfScope)) {
      if (this.matchRule(cleanTarget, rule)) {
        return {
          allowed: false,
          reason: `Violates Out-of-Scope Rule: "${rule.pattern}" (${rule.description || 'Custom Rule'})`,
          matchedRule: rule.pattern,
        };
      }
    }

    // 2. If no in-scope rules defined, permit with warning
    if (this.inScopePatterns.length === 0 && !this.customRules.some(r => !r.isOutOfScope)) {
      return { allowed: true, reason: 'No in-scope boundaries defined (Permissive Mode)' };
    }

    // 3. Check In-Scope patterns
    for (const inPattern of this.inScopePatterns) {
      if (this.matchPattern(cleanTarget, inPattern)) {
        return {
          allowed: true,
          reason: `Matches In-Scope pattern: "${inPattern}"`,
          matchedRule: inPattern,
        };
      }
    }

    for (const rule of this.customRules.filter(r => !r.isOutOfScope)) {
      if (this.matchRule(cleanTarget, rule)) {
        return {
          allowed: true,
          reason: `Matches In-Scope Rule: "${rule.pattern}"`,
          matchedRule: rule.pattern,
        };
      }
    }

    return {
      allowed: false,
      reason: `Target "${cleanTarget}" does not belong to any defined in-scope pattern`,
    };
  }

  private matchRule(target: string, rule: ScopeRule): boolean {
    if (rule.type === 'regex') {
      try {
        const re = new RegExp(rule.pattern, 'i');
        return re.test(target);
      } catch {
        return false;
      }
    }
    return this.matchPattern(target, rule.pattern);
  }

  private matchPattern(target: string, pattern: string): boolean {
    const cleanPattern = pattern.trim().toLowerCase();

    // Exact match
    if (target === cleanPattern) return true;

    // Wildcard domain match (e.g. *.example.com or .example.com)
    if (cleanPattern.startsWith('*.')) {
      const root = cleanPattern.substring(2);
      if (target === root || target.endsWith('.' + root)) {
        return true;
      }
    } else if (cleanPattern.startsWith('.')) {
      const root = cleanPattern.substring(1);
      if (target === root || target.endsWith('.' + root)) {
        return true;
      }
    }

    // Wildcard IP match (e.g. 192.168.1.*)
    if (cleanPattern.endsWith('.*')) {
      const prefix = cleanPattern.slice(0, -2);
      if (target.startsWith(prefix)) return true;
    }

    // CIDR basic approximation
    if (cleanPattern.includes('/')) {
      return this.matchCidr(target, cleanPattern);
    }

    return false;
  }

  private matchCidr(ip: string, cidr: string): boolean {
    try {
      const [range, bitsStr] = cidr.split('/');
      const bits = parseInt(bitsStr, 10);
      if (isNaN(bits) || bits < 0 || bits > 32) return false;

      const ipNum = this.ipToNumber(ip);
      const rangeNum = this.ipToNumber(range);
      if (ipNum === null || rangeNum === null) return false;

      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (ipNum & mask) === (rangeNum & mask);
    } catch {
      return false;
    }
  }

  private ipToNumber(ip: string): number | null {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
      return null;
    }
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }
}
