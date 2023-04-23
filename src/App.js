import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import FederatedLearning from "./contracts/FederatedLearning.json";

const provider = new ethers.BrowserProvider(window.ethereum);

function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [initiatorIP, setInitiatorIP] = useState("<IP Address>");
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
    <div className="flex items-center justify-center bg-gray-500 min-h-screen">
      <div className="m-8 p-5 bg-black shadow-2xl rounded-lg text-white text-center">
        <h1
          className="text-5xl
        font-semibold p-8"
        >
          Federated Learning 🤝 Blockchain
        </h1>

        <p className="py-10 font-medium">
          Connected wallet address:{" "}
          <div className="bg-orange-500 rounded-3xl p-2 font-light font-mono mx-32">
            {account}
          </div>
        </p>

        <div className="flex flex-col gap-5">
          <button
            className="bg-indigo-500 p-3 hover:bg-indigo-800 rounded-xl mx-32"
            onClick={registerClient}
          >
            Join to network
          </button>
          {/* {errors && "register_client" in errors && errors["register_client"]} */}

          <button
            className="bg-green-500 p-3 hover:bg-green-800 rounded-xl mx-32"
            onClick={initiateRound}
          >
            Initiate a round
          </button>

          <div className="hover:bg-gray-800 p-2 rounded-xl mx-32">
            <input
              className="w-4 h-4 text-blue-800 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <label className="pl-5">Give consent to participate</label>
            <button
              className="bg-indigo-500 p-3 ml-6 hover:bg-indigo-800 rounded-xl"
              onClick={giveConsent}
            >
              Submit
            </button>
          </div>

          <div
            className="
          hover:bg-gray-800 p-4 rounded-xl mx-32"
          >
            <p>Initiator IP address: {initiatorIP}</p>
            <button
              className="bg-green-500 p-3 mt-5 hover:bg-green-800 rounded-xl"
              onClick={getInitiatorIP}
            >
              Get initiator IP address
            </button>
          </div>

          <button
            className="bg-red-500 p-3 hover:bg-red-800 rounded-xl mx-32"
            onClick={cleanupRound}
          >
            Cleanup round
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
