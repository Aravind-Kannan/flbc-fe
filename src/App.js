import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import FederatedLearning from "./contracts/FederatedLearning.json";

const provider = new ethers.BrowserProvider(window.ethereum);

function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [initiatorIP, setInitiatorIP] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    function clientRegisteredListener(clientAddress, event) {
      console.log("BREAKING NEWS: ClientRegistered", clientAddress, event);
    }

    function federatedLearningRoundInitiatedListener(clientAddress, event) {
      console.log(
        "BREAKING NEWS: FederatedLearningRoundInitiated",
        clientAddress,
        event
      );
    }

    function clientConsentedListener(clientAddress, event) {
      console.log("BREAKING NEWS: ClientConsented", clientAddress, event);
    }

    function federatedLearningRoundCompletedListener(clientAddress, event) {
      console.log(
        "BREAKING NEWS: FederatedLearningRoundCompleted",
        clientAddress,
        event
      );
    }

    const init = async () => {
      // Load the smart contract
      const signer = await provider.getSigner();

      const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
      const contract = new ethers.Contract(
        contractAddress,
        FederatedLearning,
        signer
      );
      const contractWithSigner = contract.connect(signer);

      console.log(contractWithSigner);

      contractWithSigner.on("ClientRegistered", clientRegisteredListener);
      contractWithSigner.on(
        "FederatedLearningRoundInitiated",
        federatedLearningRoundInitiatedListener
      );
      contractWithSigner.on("ClientConsented", clientConsentedListener);
      contractWithSigner.on(
        "FederatedLearningRoundCompleted",
        federatedLearningRoundCompletedListener
      );

      setContract(contractWithSigner);
      const address = await signer.getAddress();
      setAccount(address);
    };

    init();

    return () => {
      if (contract) {
        contract.off("ClientRegistered", clientRegisteredListener);
        contract.off(
          "FederatedLearningRoundInitiated",
          federatedLearningRoundInitiatedListener
        );
        contract.off("ClientConsented", clientConsentedListener);
        contract.off(
          "FederatedLearningRoundCompleted",
          federatedLearningRoundCompletedListener
        );
      }
    };
  }, []);

  const registerClient = async () => {
    try {
      const tx = await contract.register();
      await tx.wait();
      console.log("Client registered: ", tx.hash);
    } catch (err) {
      const code = err.data.replace("Reverted ", "");
      console.log({ err });
      let reason = ethers.toUtf8String("0x" + code.substr(138));
      reason = reason.replace(/\0/g, "");
      setErrors((prevState) => {
        return { ...prevState, register_client: reason };
      });
    }
  };

  const initiateRound = async () => {
    console.log(await contract.listeners("FederatedLearningRoundInitiated"));
    let response = await fetch(
      "http://127.0.0.1:5000/jobs/initiator/address"
    ).then((response) => response.json());
    console.log(response.address);
    const tx = await contract.initiate(response.address);
    await tx.wait();
    console.log("Round initiated: ", tx.hash);
    await fetch("http://127.0.0.1:5000/jobs/initiator", {
      method: "post",
    });
  };

  const giveConsent = async () => {
    console.log(await contract.listeners("ClientConsented"));
    const tx = await contract.participate(consent);
    await tx.wait();
    console.log("Consent given: ", tx.hash);
  };

  const getInitiatorIP = async () => {
    const ip = await contract.getInitiatorIP(account);
    setInitiatorIP(ip);
    const res = await fetch("http://127.0.0.1:5000/jobs/client", {
      method: "post",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        address: ip,
      }),
    });
    console.log(res);
  };

  const cleanupRound = async () => {
    console.log(await contract.listeners("FederatedLearningRoundCompleted"));
    const tx = await contract.cleanup();
    await tx.wait();
  };

  return (
    <div className="App">
      <h1>Federated Learning</h1>

      <p>Connected wallet address: {account}</p>

      <button onClick={registerClient}>Join to network</button>
      {errors && "register_client" in errors && errors["register_client"]}

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
