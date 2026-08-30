import ManageClient from "./ManageClient";
export default async function Manage({params}){const {token}=await params;return <main className="container"><nav className="nav"><a className="brand" href="/">VALE BEAUTY VK</a></nav><section className="section"><h1>Manage Appointment</h1><ManageClient token={token}/></section></main>}
