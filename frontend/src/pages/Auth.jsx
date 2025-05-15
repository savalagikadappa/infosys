import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Auth() {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('candidate');
    const navigate = useNavigate();
    const bubblesCanvasRef = useRef(null);

    useEffect(() => {
        const canvas = bubblesCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        let bubbles = Array.from({ length: 35 }, () => ({
            x: Math.random() * width,
            y: height + Math.random() * height / 2,
            r: 18 + Math.random() * 32,
            speed: 0.5 + Math.random() * 1.2,
            alpha: 0.2 + Math.random() * 0.4,
            drift: (Math.random() - 0.5) * 0.7
        }));
        let animation;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            for (let b of bubbles) {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(96,165,250,${b.alpha})`;
                ctx.fill();
                b.y -= b.speed;
                b.x += b.drift;
                if (b.y + b.r < 0) {
                    b.y = height + b.r;
                    b.x = Math.random() * width;
                }
            }
            animation = requestAnimationFrame(draw);
        }
        draw();
        function handleResize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }
        window.addEventListener('resize', handleResize);
        return () => {
            cancelAnimationFrame(animation);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isSignup ? '/api/auth/signup' : '/api/auth/login';

        const body = isSignup ? { email, password, role } : { email, password };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok) {
            if (isSignup) {
                alert('Signup successful! Please login.');
                setIsSignup(false);
            } else {
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role); // Store role
                localStorage.setItem('name', data.name); // Store name
                localStorage.setItem('email', data.email); // Store email
                alert('Logged in!');
                // Redirect based on role
                if (data.role === 'candidate') navigate('/candidate-dashboard');
                else if (data.role === 'trainer') navigate('/trainer-dashboard');
                else if (data.role === 'examiner') navigate('/examiner-dashboard');
                else if (data.role === 'coordinator') navigate('/coordinator-dashboard');
                else navigate('/');
            }
        } else {
            alert(data.message || 'Error');
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
            {/* Animated bubbles background */}
            <canvas ref={bubblesCanvasRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none" />
            {/* Auth card (centered, above background) */}
            <div className="relative z-10 w-full max-w-md p-10 rounded-2xl border border-blue-500 shadow-lg bg-white flex flex-col items-center">
                {/* Minimal logo/brand mark */}
                <div className="mb-8 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold select-none">i</span>
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-blue-700 mb-2 tracking-tight text-center">
                    {isSignup ? 'Sign Up' : 'Login'}
                </h2>
                <div className="w-10 h-1 bg-blue-500 rounded-full mb-8 mx-auto" />
                <form onSubmit={handleSubmit} className="space-y-6 w-full">
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-0 py-3 border-0 border-b-2 border-blue-100 focus:border-blue-600 focus:ring-0 bg-transparent placeholder-blue-400 text-blue-900 text-lg transition"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-0 py-3 border-0 border-b-2 border-blue-100 focus:border-blue-600 focus:ring-0 bg-transparent placeholder-blue-400 text-blue-900 text-lg transition"
                        />
                    </div>
                    {isSignup && (
                        <div>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-0 py-3 border-0 border-b-2 border-blue-100 focus:border-blue-600 focus:ring-0 bg-transparent text-blue-900 text-lg transition"
                            >
                                <option value="candidate">Candidate</option>
                                <option value="examiner">Examiner</option>
                                <option value="trainer">Trainer</option>
                                <option value="coordinator">Coordinator</option>
                            </select>
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition"
                    >
                        {isSignup ? 'Sign Up' : 'Login'}
                    </button>
                </form>
                <button
                    onClick={() => setIsSignup(!isSignup)}
                    className="mt-8 w-full text-blue-600 font-semibold hover:underline text-base"
                >
                    {isSignup ? 'Already have an account? Login' : 'Create an account'}
                </button>
            </div>
        </div>
    );
}

// Starfield animation for bottom-right quadrant
function useStarfield() {
    useEffect(() => {
        const canvas = document.getElementById('starfield-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.offsetWidth;
        let height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;
        let stars = Array.from({ length: 60 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: 0.7 + Math.random() * 1.5,
            dx: 0.1 + Math.random() * 0.3,
        }));
        let animation;
        function draw() {
            ctx.clearRect(0, 0, width, height);
            for (let s of stars) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
                ctx.fillStyle = '#fff';
                ctx.globalAlpha = 0.8;
                ctx.fill();
                ctx.globalAlpha = 1;
                s.x += s.dx;
                if (s.x > width) s.x = 0;
            }
            animation = requestAnimationFrame(draw);
        }
        draw();
        return () => cancelAnimationFrame(animation);
    }, []);
}

function AuthWithStarfield(props) {
    useStarfield();
    return <Auth {...props} />;
}

export default AuthWithStarfield;