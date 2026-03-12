'use client'
import { useState } from "react"

export default function Dashboard(){

    const [EventDetails, setEventDetails] = useState("")
    const [hover, setHover] = useState(false)

    return(
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "100px",
            gap: "20px"
        }}>

            <h1>Enter Details about the Event</h1>

            <textarea
                value={EventDetails}
                onChange={(e) => setEventDetails(e.target.value)}
                placeholder="Enter event details..."
                style={{
                    width: "500px",
                    height: "200px",
                    padding: "12px",
                    fontSize: "16px",
                    border: "2px solid black",
                    borderRadius: "8px"
                }}
            />

            <button
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{
                    color: "black",
                    padding: "10px 25px",
                    fontSize: "16px",
                    border: "2px solid black",
                    borderRadius: "8px",
                    backgroundColor: hover ? "#e0e0e0" : "white",
                    cursor: "pointer"
                }}
            >
                Submit
            </button>

        </div>
    )
}