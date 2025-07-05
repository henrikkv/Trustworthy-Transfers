function toHex(data: string): string {
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += data.charCodeAt(i).toString(16);
  }
  return result.padEnd(64, "0");
}

function toUtf8HexString(data: string): string {
  return "0x" + toHex(data);
}

async function prepareAttestationRequestBase(
  url: string,
  apiKey: string,
  attestationTypeBase: string,
  sourceIdBase: string,
  requestBody: any,
): Promise<any> {
  console.log("Verifier URL:", url);
  
  const attestationType = toUtf8HexString(attestationTypeBase);
  const sourceId = toUtf8HexString(sourceIdBase);

  const request = {
    attestationType: attestationType,
    sourceId: sourceId,
    requestBody: requestBody,
  };
  
  console.log("Prepared request:", request);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (response.status !== 200) {
    const errorText = await response.text();
    throw new Error(
      `Response status is not OK, status ${response.status} ${response.statusText}: ${errorText}`
    );
  }

  console.log("Response status is OK");
  return await response.json();
}

const attestationTypeBase = "Web2Json";
const sourceIdBase = "PublicWeb2";

async function prepareWiseAttestationRequest(
  transferId: string,
  wiseApiKey: string,
  verifierUrl: string,
  verifierApiKey: string,
): Promise<any> {
  const apiUrl = `https://api.transferwise.com/v1/transfers/${transferId}`;
  const httpMethod = "GET";
  const headers = JSON.stringify({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${wiseApiKey}`
  });
  const queryParams = "{}";
  const body = "{}";
  
  const postProcessJq = `{id: .id, targetAccount: .targetAccount, status: .status, userMessage: .reference, targetValue: (.targetValue * 100 | floor), targetCurrency: .targetCurrency}`;
  
  const abiSignature = `{"components": [{"internalType": "uint256", "name": "id", "type": "uint256"},{"internalType": "uint256", "name": "targetAccount", "type": "uint256"},{"internalType": "string", "name": "status", "type": "string"},{"internalType": "address", "name": "userMessage", "type": "address"},{"internalType": "uint256", "name": "targetValue", "type": "uint256"},{"internalType": "string", "name": "targetCurrency", "type": "string"}],"name": "task","type": "tuple"}`;

  const requestBody = {
    url: apiUrl,
    httpMethod: httpMethod,
    headers: headers,
    queryParams: queryParams,
    body: body,
    postProcessJq: postProcessJq,
    abiSignature: abiSignature,
  };

  const url = `${verifierUrl}Web2Json/prepareRequest`;
  
  console.log("Preparing Wise attestation request for transfer ID:", transferId);
  console.log("API URL:", apiUrl);

  return await prepareAttestationRequestBase(
    url,
    verifierApiKey,
    attestationTypeBase,
    sourceIdBase,
    requestBody,
  );
}

export {
  toHex,
  toUtf8HexString,
  prepareAttestationRequestBase,
  prepareWiseAttestationRequest,
  attestationTypeBase,
  sourceIdBase,
}; 