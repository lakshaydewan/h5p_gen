'use client';

import { useState } from "react";

export default function Home() {

  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">H5P Generator</h1>
      <p className="text-xl">Get your custom H5P content in seconds</p>
        <select onChange={(e)=> console.log(e.target.value)} className="py-2 mt-4 border-neutral-700 bg-transparent focus-within:outline-none border rounded-md" name="" id="">
          <option value="Words">CrossWords</option>
        </select>
        <button onClick={async ()=> {
          setLoading(true);
            const res = await fetch('/api', {
              method: 'GET',
            });
            const data = await res.json();
            const url = data.uploadedFile[0].data.ufsUrl;
            setUrl(url);
            setLoading(false);
        }} disabled={loading} className="mt-4 disabled:cursor-not-allowed cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">{loading ? 'Creating...' : 'Create'}</button>
        {
          url && (
            <a href={url} target="_blank" rel="noreferrer" className="mt-4 text-blue-500 hover:underline">
              Download Link
            </a>
          )
        }
    </div>
  );
}
