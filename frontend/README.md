# Trustworthy Transfers Frontend

A React frontend for the Trustworthy Transfers application using Flare Data Connector (FDC) to verify Wise API transfer data on-chain.

## Overview

This application demonstrates how to use Flare Data Connector (FDC) to bring real-world data from the Wise API into smart contracts. The process involves:

1. **Prepare Attestation Request**: Create a request to verify Wise transfer data
2. **Submit Attestation Request**: Submit the request to the FDC network
3. **Retrieve Data and Proof**: Get the verified data and cryptographic proof
4. **Interact with Smart Contract**: Use the proof to update the on-chain contract
