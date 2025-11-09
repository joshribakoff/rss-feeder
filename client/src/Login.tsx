function Login() {
  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
  };

  const handleGitHubLogin = () => {
    window.location.href = '/auth/github';
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>RSS Clusters</h1>
        <p>Please sign in to continue</p>
        <button onClick={handleGoogleLogin} className="google-login-btn">
          Sign in with Google
        </button>
        <button onClick={handleGitHubLogin} className="github-login-btn">
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}

export default Login;
