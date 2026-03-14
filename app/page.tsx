"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function SplashPage() {
  const router = useRouter()
  // Control the animation stages: hidden -> entering -> exiting
  const [stage, setStage] = useState("hidden") 

  useEffect(() => {
    // 1. Trigger enter animation immediately after mount
    // A tiny timeout ensures the browser renders the "hidden" state first
    const enterTimer = setTimeout(() => setStage("entering"), 50)

    // 2. Trigger exit fade-out at 2.2 seconds
    const exitTimer = setTimeout(() => {
      setStage("exiting")
    }, 2200)

    // 3. Execute the redirect at 2.8 seconds (after exit animation finishes)
    const navTimer = setTimeout(() => {
      router.push("/dashboard")
    }, 2800)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(navTimer)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-white flex justify-center items-center overflow-hidden">
      <img 
        src="/logo.png" 
        width={340} 
        alt="Beehive logo" 
        className={`transition-all duration-1000 ease-out transform ${
          stage === "hidden" 
            ? "opacity-0 scale-100 translate-y-4" // Start small, transparent, and slightly lower
            : stage === "entering" 
            ? "opacity-100 scale-100 translate-y-0" // Glide into place
            : "opacity-0 scale-105 -translate-y-2" // Float up and fade out before redirect
        }`}
      />
    </div>
  )
}