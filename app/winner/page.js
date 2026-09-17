import {Suspense} from "react";
import WinnerClaimClient from "./WinnerClaimClient";
export default function WinnerPage(){return <Suspense fallback={<div className="bookingbox"><p>Loading…</p></div>}><WinnerClaimClient/></Suspense>}
