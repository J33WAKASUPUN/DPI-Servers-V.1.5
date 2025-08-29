require('dotenv').config();

const SLUDI_CONFIG = {
  // SLUDI Sandbox URLs
  ESIGNET_SERVICE_URL: process.env.ESIGNET_SERVICE_URL || "https://sludiauth.icta.gov.lk/service",
  ESIGNET_AUD_URL: process.env.ESIGNET_AUD_URL || "https://sludiauth.icta.gov.lk/service/oauth/v2/token",
  
  // Client Configuration (will be provided by ICTA)
  CLIENT_ID: process.env.SLUDI_CLIENT_ID || "YOUR_CLIENT_ID_FROM_ICTA",
  CLIENT_ASSERTION_TYPE: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
  
  // Response Types
  USERINFO_RESPONSE_TYPE: "jwk",
  
  // Private Key for JWT signing (from mkjwk.org - store as JSON string in env)
  CLIENT_PRIVATE_KEY: process.env.CLIENT_PRIVATE_KEY ? JSON.parse(process.env.CLIENT_PRIVATE_KEY) : {
    // Your actual generated private key from mkjwk.org
    "p": "8hk7LZKUhTKcd5774HCPc_lflDaQifS0A-yabqZ67kfYVdTYGpUQRACHtyhG1yHCLQMyJKph6T1A7m-zwwAjeKASdV-dLBeZNxe0qoy6ml1Lw50wDS_Kmspjt4OjflzGGU-9Jzz7xUcfFsB-j6QcxC7VBhUBameptKlOfJGHxQ0",
    "kty": "RSA",
    "q": "weFZDh_qEsEYJbJu2rDWlzEdGVulD-JRGvCdAGUh192g2B_RqZBSoqOgVxBvFEFZWqTJkfpHGzyFrXmgpQFJ3rmFEmu90Q-tbotFN0Cw3fWPUHrlpsRs_jcDx4c8d3VhAjkUxx1EGINxoyW8UYlqPNIXFcz1guJxGuF6_bNn-KE",
    "d": "SDgyaTWPL1G20fORRyN_vrcMUlYPfJNuVB_UiAVMHhCXrniXld4Ay4Rnibw6UqRc7JnO93PWh_UqWqiQSBpD_tNq8p2FWhtFdONbM6yla4BPDmL1EJpqjVJYkvvgd9wXnBRAoI_2uN3WeZ-nOT3-Imnop5sXyIvYB0jMgfxYAGxabEv_rSu6KL011apY0MdtpTWhSzlss4Sm2-oORLqkP28fgTmxHeNq5qho3c6yT3mm7LF0Teae4TGdeOVLsnVKZ1XEZ8kXqeq21y6W1lB0zj2wCmKDGUlqBBQkcBPcrogdwF2Yn-Oglbk_xZJS5P_wOxkr6P3s8MoIKW-ypZ_FAQ",
    "e": "AQAB",
    "use": "sig",
    "kid": "sludi-client-key-1",
    "qi": "cSi0nswEBQmkTBkYJ8PDipXHh1KUCGBqQWNGnDEZWhT4VsYp7WXxxBpJXqytOy4lVGMIuKmMBrpHOh6VUvbMzkHymsNHIx-ZaflWGkawXPUETuyccv28Qu8HIPyiKTlEACOWEepo1H4y8F_O3D6RwnbPKjq5oh5fTR07fbdASBY",
    "dp": "Yu9IrcD_DMe4BXJlAD0_gmdgVdNOkfH8NrZUDe_ewM1_bOQERCiycve8fm7pNDVJgteRgEZYqNYtWMMxNPkzhbH0mR6vvjsOk-MOI7xK7ZY-xfvQjTMAmu0mfvI-t_71vZZGeGiFgwMjg0q67bxlPQ7eYxPmdjNSuM-PkXxvfWk",
    "alg": "RS256",
    "dq": "NiV4WKCDH8-7rbOCkCL5G2qFBPL6S1BadFqkjlqwM_halmF0jZWX7oIiIo6dZxvFF7KT9Off-fRSJRulyM9uUPyg9H8QmRV2yzusDf1MKAEPkFtyTbvn8Ktuq8fSFE681AEbE2zR-sKi9vxv9pmZCPlnpxgBrRcOnYJBdh8nt2E",
    "n": "t1oiAn-yTF7eTGKlzRLPw-4ZmY9mRX0BC_s_DSsPuOGw2i3MN6um1yxcF3ETSZd4L1n7xJrEHlfjb9-9NHyZcrwqMAsHCZYKl9GrD3MHhMR2mHcytjEZ4Ysn3C8UuWBABsgsefJOq7C8a2dI-pjqXWtkmCA0ZfvXLC3Qn7aiF7tcCln1xgFkuZCzUqYAFdZyvxj050P64M_KRuHkA_ISHLNNkyuLdKs-fNaXfwS946H9ak1620XfwsAweYMaExbfZiD6lxtvRQLceibTlxtUxJHz3T4AO_t-Pn7EU1UHei0ZrMDN2-h7Sce9wVvypSLGKnL90M5swElZ5nWUbIKFLQ"
  },
  
  // JWE Configuration for encrypted userinfo
  JWE_USERINFO_PRIVATE_KEY: process.env.JWE_USERINFO_PRIVATE_KEY || 'ewogICJwIjogIjJlWDNaVmxMejR1UFJBTE5uQVI3dl91aGJsOWI3OXNfLWpteFcxaTdiMGZaTV9SZHNWT09yWW9uZ05WQWpuVHFSQm1SRXRndXVHM21LMjZnTDdZMVN',
  
  // OAuth Scopes
  SUPPORTED_SCOPES: ['openid', 'profile', 'resident-service', 'basic'],
  
  // Claims mapping
  CLAIMS_MAPPING: {
    'given_name': 'firstName',
    'family_name': 'lastName',
    'name': (citizen) => `${citizen.firstName} ${citizen.lastName}`,
    'email': 'email',
    'phone_number': 'phoneNumber',
    'sub': 'citizenId',
    'picture': null // Not implemented yet
  }
};

module.exports = SLUDI_CONFIG;