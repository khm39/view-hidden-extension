import { useState } from "react"

import "./style.css"

function IndexPopup() {
  const [data, setData] = useState("")

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">
        Welcome to your{" "}
        <a
          href="https://www.plasmo.com"
          target="_blank"
          className="text-blue-600 hover:underline">
          Plasmo
        </a>{" "}
        Extension!
      </h2>
      <input
        onChange={(e) => setData(e.target.value)}
        value={data}
        className="border border-gray-300 rounded px-2 py-1 mb-2 w-full"
      />
      <a
        href="https://docs.plasmo.com"
        target="_blank"
        className="text-blue-600 hover:underline">
        View Docs
      </a>
    </div>
  )
}

export default IndexPopup
