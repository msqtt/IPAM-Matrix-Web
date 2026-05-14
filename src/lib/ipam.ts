import ipaddr from 'ipaddr.js';

export interface Allocation {
  id: string;
  cidr: string;
  owner: string;
  purpose: string;
  tags: string[];
  createdAt: number;
}

export interface BaseNetwork {
  cidr: string;
  description?: string;
}

export interface IPAMData {
  baseNetworks: BaseNetwork[];
  allocations: Allocation[];
}

export function isValidCIDR(cidr: string): boolean {
  try {
    ipaddr.parseCIDR(cidr);
    return true;
  } catch (e) {
    return false;
  }
}

export function ipToNum(cidr: string): number {
  try {
    const p = ipaddr.parseCIDR(cidr)[0] as ipaddr.IPv4;
    const bytes = p.toByteArray();
    return bytes[0] * 16777216 + bytes[1] * 65536 + bytes[2] * 256 + bytes[3];
  } catch {
    return 0;
  }
}

export function getSize(cidr: string): number {
  try {
    const parsed = ipaddr.parseCIDR(cidr);
    const prefix = parsed[1];
    return Math.pow(2, 32 - prefix);
  } catch {
    return 0;
  }
}

/**
 * Checks if two CIDRs overlap.
 */
export function isOverlap(cidr1: string, cidr2: string): boolean {
  try {
    const c1 = ipaddr.parseCIDR(cidr1);
    const c2 = ipaddr.parseCIDR(cidr2);
    if (c1[0].kind() !== c2[0].kind()) return false;

    if (c1[1] <= c2[1]) {
      return c2[0].match(c1);
    } else {
      return c1[0].match(c2);
    }
  } catch (e) {
    return false;
  }
}

/**
 * Checks if cidr2 is completely contained within cidr1
 */
export function isSubnet(baseCidr: string, subCidr: string): boolean {
  try {
    const base = ipaddr.parseCIDR(baseCidr);
    const sub = ipaddr.parseCIDR(subCidr);
    
    if (base[0].kind() !== sub[0].kind()) return false;
    
    // The subnet must have a larger or equal prefix (smaller network)
    if (sub[1] < base[1]) return false;
    
    // The subnet's IP must match the base network
    return sub[0].match(base);
  } catch {
    return false;
  }
}

export function numToIp(num: number): string {
  const b1 = (num >>> 24) & 255;
  const b2 = (num >>> 16) & 255;
  const b3 = (num >>> 8) & 255;
  const b4 = num & 255;
  return `${b1}.${b2}.${b3}.${b4}`;
}

export function splitSubnet(cidr: string, newPrefix: number): string[] {
  try {
    const parsed = ipaddr.parseCIDR(cidr);
    const ip = parsed[0] as ipaddr.IPv4;
    const oldPrefix = parsed[1];
    
    if (newPrefix <= oldPrefix || newPrefix > 32 || ip.kind() !== 'ipv4') {
      return [];
    }
    
    const startNum = ipToNum(cidr);
    const step = Math.pow(2, 32 - newPrefix);
    const count = Math.pow(2, newPrefix - oldPrefix);
    
    const subnets = [];
    for (let i = 0; i < count; i++) {
      subnets.push(`${numToIp(startNum + (i * step))}/${newPrefix}`);
    }
    
    return subnets;
  } catch {
    return [];
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}
