"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    async function testBackend() {
      const res = await fetch(
        "http://localhost:3000/api/ping",
        { credentials: "include" }
      );

      const data = await res.json();
      console.log("BACKEND RESPONSE:", data);
    }

    testBackend();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Frontend çalışıyor</h1>
      <p>Console'u aç (F12)</p>
    </div>
  );
}
