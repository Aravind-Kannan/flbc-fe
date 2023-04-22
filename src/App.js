import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import FederatedLearning from "./contracts/FederatedLearning.json";

function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [initiatorIP, setInitiatorIP] = useState("");
  const [consent, setConsent] = useState(false);
  console.log(process.env);

  useEffect(() => {
    const init = async () => {
      // Load the smart contract
      console.log(process.env);
      console.log(process.env.REACT_APP_PRIVATE_KEY);
      const provider = ethers.getDefaultProvider(
        process.env.REACT_APP_PROVIDER_URL
      );
      console.log(provider);
      const signer = new ethers.Wallet(
        process.env.REACT_APP_PRIVATE_KEY,
        provider
      );
      console.log(signer);

      const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
      const contract = new ethers.Contract(
        contractAddress,
        FederatedLearning,
        signer
      );
      const contractWithSigner = contract.connect(signer);
      setContract(contractWithSigner);
      setAccount(signer.address);
    };

    init();
  }, []);

  const registerClient = async () => {
    const tx = await contract.register();
    await tx.wait();
    console.log("Client registered: ", tx.hash);
  };

  const initiateRound = async () => {
    const ipAddress = "192.168.0.1"; // replace with the client's IP address
    const tx = await contract.initiate(ipAddress);
    await tx.wait();
    console.log("Round initiated: ", tx.hash);
  };

  const giveConsent = async () => {
    const tx = await contract.participate(consent);
    await tx.wait();
    console.log("Consent given: ", tx.hash);
  };

  const getInitiatorIP = async () => {
    const ip = await contract.getInitiatorIP(account);
    setInitiatorIP(ip);
  };

  const cleanupRound = async () => {
    const tx = await contract.cleanup();
    await tx.wait();
  };

  return (
    <div className="App">
      <h1>Federated Learning</h1>

      <p>Connected wallet address: {account}</p>

      <button onClick={registerClient}>Register as a client</button>

      <button onClick={initiateRound}>Initiate a round</button>

      <div>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <label>Give consent to participate</label>
        <button onClick={giveConsent}>Submit</button>
      </div>

      <button onClick={getInitiatorIP}>Get initiator IP address</button>
      <p>Initiator IP address: {initiatorIP}</p>

      <button onClick={cleanupRound}>Cleanup round</button>
    </div>
  );
}

export default App;
