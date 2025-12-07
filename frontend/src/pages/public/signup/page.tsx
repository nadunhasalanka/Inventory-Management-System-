// "use client" - removed for Vite
import { useNavigate } from "react-router-dom"
import SignupScreen from "../../../components/SignupScreen"

export default function SignupPage(){
  const navigate = useNavigate()
  return <SignupScreen onSwitchToLogin={() => navigate('/login')} />
}
