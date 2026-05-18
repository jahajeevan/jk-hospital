/**
 * Prefer IPv4 for outbound API calls — fixes Node fetch/Stripe ENOTFOUND on some Mac networks.
 */
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');
