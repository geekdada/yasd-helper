import forge, { pki } from 'node-forge'
import _ from 'lodash'

export const issueCertForDomain = (
  p12b64: string,
  passphrase: string,
  domain: string,
): {
  cert: string
  key: string
} => {
  const ca = getP12(p12b64, passphrase)
  const keyPair = pki.rsa.generateKeyPair(2048)
  const cert = pki.createCertificate()
  const attrs = [
    {
      name: 'commonName',
      value: domain,
    },
    {
      name: 'countryName',
      value: 'CN',
    },
    {
      shortName: 'ST',
      value: 'Beijing',
    },
    {
      name: 'localityName',
      value: 'Beijing',
    },
    {
      name: 'organizationName',
      value: 'YASD',
    },
    {
      shortName: 'OU',
      value: 'IT',
    },
  ]

  cert.publicKey = keyPair.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
  cert.setSubject(attrs)
  cert.setIssuer(ca.cert.subject.attributes)
  cert.setExtensions([
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2,
          value: domain,
        },
      ],
    },
  ])
  cert.sign(ca.key, forge.md.sha256.create())

  const pemKey = pki.privateKeyToPem(keyPair.privateKey)
  const pemCert = pki.certificateToPem(cert)

  return {
    cert: pemCert,
    key: pemKey,
  }
}

export const getP12 = (
  p12b64: string,
  password: string,
): {
  cert: pki.Certificate
  key: pki.PrivateKey
} => {
  const p12Der = forge.util.decode64(p12b64)
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certs = certBags[forge.pki.oids.certBag]
  const cert: pki.Certificate | undefined = _.get(certs, '[0].cert')
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]
  const key: pki.PrivateKey | undefined = _.get(keys, '[0].key')

  if (!cert || !key) {
    throw new Error('证书无效')
  }

  return {
    cert,
    key,
  }
}
