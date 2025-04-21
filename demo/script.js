const TonWeb = window.TonWeb;

 const decodeB64 = (b64) => {
      try {
        return atob(b64);
      } catch (e) {
        return "[uncorrect base64]";
      }
    };


function formatTimestamp(hex) {
  try {
    const unix = parseInt(hex, 16);
    const date = new Date(unix * 1000);
    return date.toLocaleString("ru-RU");
  } catch (e) {
    return "[unknown]";
  }
}

async function callDidGetter() {
  const contract = document.getElementById("contract").value.trim();
  const output = document.getElementById("output");

  if (!contract || !contract.startsWith("did:ton:")) {
    alert("Enter correct DID (example, did:ton:...)");
    return;
  }

  const address = contract.replace("did:ton:", "");

  try {
    const response = await fetch("https://testnet.toncenter.com/api/v2/runGetMethod", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        method: "get_did_info",
        stack: []
      })
    });

    const data = await response.json();
    if (data.result.exit_code !== 0) {
      output.textContent = `Error: exit code ${data.result.exit_code}`;
      return;
    }

    const stack = data.result.stack;
    const storageType = decodeB64(stack[0][1].object.data["b64"]);
    const storageRef  = decodeB64(stack[1][1].object.data["b64"]);
    const updatedAt = formatTimestamp(stack[2][1]);

    output.textContent = `📦 Storage Type: ${storageType}\n🔗 Storage Ref: ${storageRef}\n🕒 Updated At: ${updatedAt}`;
  } catch (err) {
    output.textContent = "Request error: " + err;
  }
}
