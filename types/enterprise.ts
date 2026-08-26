export type IndustrySector = 
  | 'fintech'
  | 'banking'
  | 'health_pharma'
  | 'ecommerce'
  | 'government'
  | 'defense_aerospace'
  | 'energy_utilities'
  | 'saas_cloud'
  | 'telecom'
  | 'manufacturing'
  | 'retail'
  | 'legal_compliance';

export type EnterpriseTier = 
  | 'tier1_mission_critical'
  | 'tier2_enterprise'
  | 'tier3_retainer'
  | 'incident_response'
  | 'vip_defense';

export type SlaLevel = 
  | '24_7_soc_15m_crit'
  | '4h_business_response'
  | '12h_standard_mssp'
  | 'custom_contract_sla';

export type ComplianceFramework = 
  | 'ISO27001'
  | 'SOC2_TYPE2'
  | 'LGPD'
  | 'GDPR'
  | 'PCI_DSS_V4'
  | 'NIST_CSF'
  | 'HIPAA'
  | 'CIS_CONTROLS';

export type ConfidentialityLevel = 
  | 'strictly_confidential'
  | 'restricted_mssp'
  | 'internal_soc_only'
  | 'public_disclosure';

export interface CloudAccount {
  provider: 'aws' | 'gcp' | 'azure' | 'oci' | 'cloudflare' | 'digitalocean';
  accountId: string;
  accountName?: string;
  regions?: string[];
  scanEnabled: boolean;
}

export interface EnterpriseContact {
  name: string;
  role: 'ciso' | 'secops_lead' | 'dpo_privacy' | 'soc_analyst' | 'executive';
  email: string;
  phone?: string;
  pgpKeyId?: string;
  notifyOnCritical: boolean;
}

export interface EnterpriseCompany {
  id: string;
  name: string;                   // Razão Social (Legal Name)
  tradeName: string;              // Nome Fantasia (Trade Name)
  cnpjOrTaxId: string;            // CNPJ / Tax ID
  industry: IndustrySector;       // Setor Econômico
  tier: EnterpriseTier;           // Nível de Atendimento MSSP
  sla: SlaLevel;                  // SLA de Resposta a Incidentes
  confidentialityLevel: ConfidentialityLevel;
  
  // Domains & Attack Surface Boundaries
  primaryDomain: string;          // Domínio Principal (ex: target.com.br)
  registeredDomains: string[];    // Domínios Adicionais Autorizados
  ipRangesCidr: string[];         // Faixas de IP CIDR Autorizadas
  cloudAccounts: CloudAccount[];  // Contas de Nuvem Monitoradas
  
  // Governance & Contacts
  contacts: EnterpriseContact[];  // Contatos CISO / SecOps
  complianceFrameworks: ComplianceFramework[]; // Frameworks de Conformidade
  
  // Contract & Authorization Lifecycle
  contractStatus: 'active' | 'onboarding' | 'audit_in_progress' | 'paused' | 'terminated';
  contractStartDate?: string;
  contractRenewalDate?: string;
  ndaSignedAt?: string;
  ndaExpiresAt?: string;
  
  // Risk Intelligence & Metrics
  compositeRiskScore: number;     // 0 a 100
  totalAssetsCount?: number;
  criticalVulnsCount?: number;
  highVulnsCount?: number;
  openFindingsCount?: number;
  
  // Security Isolation Code
  accessCode: string;             // Código Seguro de Isolamento (ex: NEXUS-A9F2-B4D1)
  customTags: string[];           // Tags Personalizadas (ex: ["core-banking", "pix-gateway"])
  notes?: string;                 // Observações confidenciais do Red Team
  createdAt: string;
  updatedAt: string;
}
