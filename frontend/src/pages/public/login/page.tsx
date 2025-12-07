// "use client" - removed for Vite
import { useNavigate } from "react-router-dom"
import LoginScreen from "../../../components/LoginScreen"

export default function LoginPage(){
  const navigate = useNavigate()
  return <LoginScreen onLoginSuccess={() => navigate('/dashboard')} onSwitchToSignup={() => navigate('/signup')} />
}
