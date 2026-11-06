import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = `${(import.meta.env.VITE_API_URL || "https://seonbaeon-backend.onrender.com").replace(/\/$/, "")}/api`;
const FAVORITES_KEY = "pick-my-teacher-favorites";
const USER_KEY = "pick-my-teacher-logged-user";

const ENGLISH_CATEGORIES = [
  "All",
  "Kids English",
  "Speaking",
  "Reading & Writing",
  "Grammar",
  "Storytelling",
  "School English",
];

async function readResponse(response) {

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      (typeof data === "string" ? data : "Something went wrong.");

    throw new Error(message);
  }

  return data;
}

/* =========================
   AUTH PAGE
========================= */

function AuthPage({ mode, setMode, onLogin }) {
  const [name, setName] = useState("");
  const [accountRole, setAccountRole] = useState("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [forgotMode, setForgotMode] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email || !password || (mode === "signup" && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const endpoint =
        mode === "signup" ? "/users/signup" : "/users/login";

      const body =
        mode === "signup"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
              role: accountRole,
            }
          : {
              email: email.trim(),
              password,
              role: accountRole,
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await readResponse(response);

      if (mode === "signup") {
        alert("Account created successfully! Please log in.");

        setMode("login");
        setName("");
        setPassword("");
      } else {
        onLogin(data);
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/users/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: forgotEmail.trim(),
          }),
        }
      );

      const data = await readResponse(response);

      setMessage(
        data.message ||
          "If an account exists with this email, a password reset link has been sent."
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to send the password reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  if (forgotMode) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-heading">
            <div className="auth-logo">
              Pick My Teacher<span>.</span>
            </div>

            <h1>Forgot Password?</h1>

            <p>
              Enter your email and we will send you a
              password reset link.
            </p>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {message && (
            <div className="form-success">
              {message}
            </div>
          )}

          <form onSubmit={handleForgotPassword}>
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={(e) =>
                setForgotEmail(e.target.value)
              }
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Reset Link →"}
            </button>
          </form>

          <div className="auth-switch">
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setError("");
                setMessage("");
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <div className="auth-logo">
            Pick My Teacher<span>.</span>
          </div>

          <h1>
            {mode === "login"
              ? "Welcome Back"
              : "Create Your Account"}
          </h1>

          <p>
            {mode === "login"
              ? "Login to continue your teacher discovery journey."
              : "Join Pick My Teacher and find the right English teacher for your child."}
          </p>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "login" && (
            <>
              <label>Login As</label>
              <select value={accountRole} onChange={(e) => setAccountRole(e.target.value)}>
                <option value="STUDENT">Student / Parent</option>
                <option value="TEACHER">English Teacher</option>
                <option value="ADMIN">Admin</option>
              </select>
            </>
          )}

          {mode === "signup" && (
            <>
              <label>Account Type</label>
              <select value={accountRole} onChange={(e) => setAccountRole(e.target.value)}>
                <option value="STUDENT">Student / Parent</option>
                <option value="TEACHER">English Teacher</option>
              </select>
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />
            </>
          )}

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          {mode === "login" && (
            <div
              style={{
                textAlign: "right",
                marginTop: "-8px",
                marginBottom: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setForgotEmail(email);
                  setError("");
                  setMessage("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#6c63ff",
                  fontSize: "14px",
                }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login →"
              : "Create Account →"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   HOME PAGE
========================= */

function HomePage({ goToTeachers }) {
  return (
    <>
      <section className="hero-section" id="home">
        <div className="hero-content">
          <p className="small-title">
            FIND THE RIGHT ENGLISH TEACHER
          </p>

          <h1>
            Know your teacher
            <br />
            <span>before you join.</span>
          </h1>

          <p className="hero-text">
            Discover English teachers for Korean children, explore
            qualifications, read reviews, and watch sample demo
            lessons before choosing.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={goToTeachers}
            >
              Find a Teacher
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                document
                  .getElementById("how")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              How It Works
            </button>
          </div>

          <div className="trust-info">
            <div>
              <strong>Profile</strong>
              <span>Know your teacher</span>
            </div>

            <div>
              <strong>Reviews</strong>
              <span>Hear from students</span>
            </div>

            <div>
              <strong>Demo</strong>
              <span>See the teaching style</span>
            </div>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-top">
            <span className="online">Available</span>
            <span>4.9 rating</span>
          </div>

          <div className="mentor-avatar" aria-hidden="true">PMT</div>

          <h2>English Teacher</h2>

          <p className="mentor-subtitle">
            Kids English & Phonics
          </p>

          <div className="mentor-details">
            <div>
              <strong>8+</strong>
              <span>Years Experience</span>
            </div>

            <div>
              <strong>250+</strong>
              <span>Students</span>
            </div>

            <div>
              <strong>98%</strong>
              <span>Positive Reviews</span>
            </div>
          </div>

          <button
            className="view-profile"
            onClick={goToTeachers}
          >
            View Teacher Profile
          </button>
        </div>
      </section>

      <section className="search-section">
        <p className="small-title">START YOUR SEARCH</p>

        <h2>Find an English teacher that fits you.</h2>

        <div className="search-box">
          <select defaultValue="English" disabled>
            <option value="English">English</option>
          </select>

          <select defaultValue="All">
            <option value="All">Select Location</option>
            <option value="Busan">Busan</option>
            <option value="Seoul">Seoul</option>
            <option value="Daegu">Daegu</option>
          </select>

          <button onClick={goToTeachers}>
            Search Teachers
          </button>
        </div>
      </section>

      <section className="how-section" id="how">
        <p className="small-title">
          HOW PICK MY TEACHER WORKS
        </p>

        <h2>
          Make a better decision
          <br />
          <span>before you commit.</span>
        </h2>

        <div className="steps">
          <div className="step">
            <div className="step-number">01</div>
            <h3>Find</h3>
            <p>
              Search English teachers based on location and
              learning needs.
            </p>
          </div>

          <div className="step">
            <div className="step-number">02</div>
            <h3>Watch</h3>
            <p>
              Watch a sample demo lesson and understand the
              teaching style.
            </p>
          </div>

          <div className="step">
            <div className="step-number">03</div>
            <h3>Trust</h3>
            <p>
              Check qualifications and read reviews from
              previous students.
            </p>
          </div>

          <div className="step">
            <div className="step-number">04</div>
            <h3>Choose</h3>
            <p>
              Compare English teachers and choose with more
              confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Don't choose a class blindly.</h2>

        <p>
          See the teacher. Feel the style. Choose with
          confidence.
        </p>

        <button
          className="primary-btn"
          onClick={goToTeachers}
        >
          Explore English Teachers
        </button>
      </section>

      <footer>
        <div className="logo">
          Pick My Teacher<span>.</span>
        </div>

        <p>Know the teacher before joining the class.</p>

        <p className="copyright">
          © 2026 Pick My Teacher. All rights reserved.
        </p>
      </footer>
    </>
  );
}

/* =========================
   TEACHER SEARCH
========================= */

function TeacherSearch({ goHome, openProfile }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");
  const [rating, setRating] = useState("All");
  const [search, setSearch] = useState("");

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(FAVORITES_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [compareTeachers, setCompareTeachers] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    async function loadTeachers() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/teachers`
        );

        const data = await readResponse(response);

        setTeachers(Array.isArray(data) ? data : (Array.isArray(data?.teachers) ? data.teachers : (Array.isArray(data?.content) ? data.content : [])));
      } catch (err) {
        setError(
          err.message ||
            "Could not connect to the backend."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTeachers();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favorites)
    );
  }, [favorites]);

  const filteredTeachers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const categoryMatch =
        category === "All" ||
        (category === "Favorites"
          ? favorites.includes(teacher.id)
          : teacher.category === category);

      const locationMatch =
        location === "All" ||
        teacher.location === location;

      const ratingMatch =
        rating === "All" ||
        Number(teacher.rating || 0) >= Number(rating);

      const searchMatch =
        !text ||
        [
          teacher.name,
          teacher.category,
          teacher.specialty,
          teacher.location,
          teacher.teachingStyle,
          teacher.qualification,
          teacher.bio,
          teacher.ageRange,
          teacher.teachingMode,
          teacher.languages,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(text)
        );

      return (
        categoryMatch &&
        locationMatch &&
        ratingMatch &&
        searchMatch
      );
    });
  }, [
    teachers,
    category,
    location,
    rating,
    search,
    favorites,
  ]);

  function toggleFavorite(id) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleCompare(teacher) {
    setCompareTeachers((current) => {
      if (
        current.some(
          (item) => item.id === teacher.id
        )
      ) {
        return current.filter(
          (item) => item.id !== teacher.id
        );
      }

      if (current.length >= 2) {
        alert(
          "You can compare up to 2 English teachers."
        );
        return current;
      }

      return [...current, teacher];
    });
  }

  return (
    <div className="teachers-page">
      <div className="teachers-header">
        <button
          className="back-home"
          onClick={goHome}
        >Back to Home</button>

        <div>
          <p className="small-title">
            FIND YOUR ENGLISH TEACHER
          </p>

          <h1>
            Find the right English teacher for you.
          </h1>

          <p>
            Explore English teachers, compare their
            experience, teaching style and reviews.
          </p>
        </div>
      </div>

      <div className="teacher-search-area">
        <div className="search-top">
          <div className="search-input-wrapper">
            <span>Search</span><input type="text"
              placeholder="Search teacher, category or specialty..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            <option value="All">
              All English Categories
            </option>

            {ENGLISH_CATEGORIES.slice(1).map(
              (item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              )
            )}

            <option value="Favorites">
              My Favorites
            </option>
          </select>

                      <select
              value={rating}
              onChange={(e) =>
                setRating(e.target.value)
              }
              aria-label="Filter by rating"
            >
              <option value="All">All Ratings</option>
              <option value="4.5">4.5+ Rating</option>
              <option value="4">4.0+ Rating</option>
              <option value="3.5">3.5+ Rating</option>
            </select>
<select
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
          >
            <option value="All">
              All Locations
            </option>
            <option value="Busan">Busan</option>
            <option value="Seoul">Seoul</option>
            <option value="Daegu">Daegu</option>
          </select>
        </div>

        <div className="results-header">
          <strong>
            {!loading && !error ? `${filteredTeachers.length} English teachers found` : loading ? "Finding English teachers..." : ""}
          </strong>

          <span>
            English teachers for Korean children
          </span>
        </div>

        {loading && (
          <div className="no-results">
            <div>Loading</div><h2>Loading teachers...</h2>

            <p>
              Getting English teachers from the
              Pick My Teacher database.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="no-results">
            <div>Warning</div><h2>Backend connection problem</h2>

            <p>{error}</p>

            <p>
              Make sure the Pick My Teacher backend is
              available.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          compareTeachers.length > 0 && (
            <div className="compare-bar">
              <div className="compare-title">
                <strong>
                  Compare English Teachers
                </strong>

                <span>
                  {compareTeachers.length} teacher
                  {compareTeachers.length > 1
                    ? "s"
                    : ""}{" "}
                  selected
                </span>
              </div>

              <div className="compare-selected">
                {compareTeachers.map((teacher) => (
                  <div
                    className="compare-mini-card"
                    key={teacher.id}
                  >
                    <span>{teacher.profileImageUrl ? (<img src={teacher.profileImageUrl} alt={teacher.name} onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement.textContent = (teacher.name || "Teacher").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }} />) : ((teacher.name || "Teacher").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase())}</span>

                    <strong>{teacher.name}</strong>

                    <button
                      onClick={() =>
                        toggleCompare(teacher)
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="compare-now-btn"
                disabled={
                  compareTeachers.length < 2
                }
                onClick={() =>
                  setShowCompare(true)
                }
              >
                Compare Now →
              </button>
            </div>
          )}

        {!loading &&
          !error &&
          filteredTeachers.length > 0 && (
            <div className="teacher-grid">
              {filteredTeachers.map((teacher) => (
                <div
                  className="teacher-card"
                  key={teacher.id}
                >
                  <button
                    className={`favorite-btn ${
                      favorites.includes(teacher.id)
                        ? "favorite-active"
                        : ""
                    }`}
                    onClick={() =>
                      toggleFavorite(teacher.id)
                    }
                  >
                    {favorites.includes(teacher.id)
                      ? "♥"
                      : "♡"}
                  </button>

                  <div className="teacher-card-top">
                    <div className="teacher-avatar">
                      {teacher.profileImageUrl ? (
                        <img
                          src={teacher.profileImageUrl}
                          alt={teacher.name}
                        />
                      ) : (
                        (teacher.name || "Teacher")
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="rating">
                      {teacher.rating
                        ? `${Number(teacher.rating).toFixed(1)} rating`
                        : "Rating unavailable"}
                    </div>
                  </div>

                  <h2>{teacher.name}</h2>

                  <p className="teacher-specialty">
                    {teacher.specialty}
                  </p>

                  <div className="teacher-tags">
                    <span>{teacher.category}</span>

                    <span>{teacher.location}</span>

                    <span>
                      {teacher.teachingStyle}
                    </span>
                  </div>

                  <div className="teacher-stats">
                    <div>
                      <strong>
                        {teacher.experience}
                      </strong>

                      <small>Experience</small>
                    </div>

                    <div>
                      <strong>
                        {teacher.studentCount}+
                      </strong>

                      <small>Students</small>
                    </div>

                    <div>
                      <strong>
                        {teacher.reviewCount}
                      </strong>

                      <small>Reviews</small>
                    </div>
                  </div>

                  <div className="teacher-actions">
                    <button
                      className="profile-btn"
                      onClick={() =>
                        openProfile(teacher)
                      }
                    >
                      View Profile
                    </button>

                    <button
                      className="compare-btn"
                      onClick={() =>
                        toggleCompare(teacher)
                      }
                    >
                      {compareTeachers.some(
                        (item) =>
                          item.id === teacher.id
                      )
                        ? "Added"
                        : "Compare"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        {!loading &&
          !error &&
          filteredTeachers.length === 0 && (
            <div className="no-results empty-state">
              <div className="status-label">No results</div>

              <h2>No English teachers found</h2>

              <p>
                Try changing your search or filters.
              </p>
            </div>
          )}

        {showCompare &&
          compareTeachers.length === 2 && (
            <CompareModal
              teachers={compareTeachers}
              onClose={() =>
                setShowCompare(false)
              }
            />
          )}
      </div>
    </div>
  );
}

/* =========================
   COMPARE MODAL
========================= */

function CompareModal({ teachers, onClose }) {
  const formatValue = (value, fallback = "Not provided") => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    return value;
  };

  const formatStudents = (value) => {
    if (!value) return "Not provided";
    return `${Number(value).toLocaleString()}+`;
  };

  const formatReviews = (value) => {
    if (!value) return "No reviews yet";
    return `${Number(value).toLocaleString()} reviews`;
  };

  const formatRate = (value) => {
    if (!value) return "Not provided";
    return `₩${Number(value).toLocaleString()}/hour`;
  };

  const formatDuration = (value) => {
    if (!value) return "Not provided";

    const text = String(value).toLowerCase();

    if (
      text.includes("min") ||
      text.includes("hour")
    ) {
      return value;
    }

    return `${value} minutes`;
  };

  const comparisonFields = [
    ["Category", "category"],
    ["Specialty", "specialty"],
    ["Location", "location"],
    ["Experience", "experience"],
    ["Students", "studentCount"],
    ["Teaching Style", "teachingStyle"],
    ["Reviews", "reviewCount"],
    ["Hourly Rate", "hourlyRate"],
    ["Lesson Duration", "lessonDuration"],
    ["Teaching Mode", "teachingMode"],
  ];

  return (
    <div
      className="compare-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-title"
    >
      <div className="compare-modal">
        <button
          className="compare-close"
          onClick={onClose}
          aria-label="Close comparison"
          type="button"
        >
          ×
        </button>

        <div className="compare-modal-heading">
          <p className="small-title">
            ENGLISH TEACHER COMPARISON
          </p>

          <h2 id="compare-title">
            Compare Teachers
          </h2>

          <p className="compare-subtitle">
            Compare two English teachers side by side
            before choosing the right fit.
          </p>
        </div>

        <div className="comparison-table">
          <div className="comparison-row comparison-header">
            <div className="comparison-feature-heading">
              Feature
            </div>

            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="comparison-teacher"
              >
                <div className="comparison-avatar">
                  {teacher.profileImageUrl ? (
                    <img
                      src={teacher.profileImageUrl}
                      alt={teacher.name}
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";

                        event.currentTarget.parentElement.textContent =
                          (teacher.name || "Teacher")
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();
                      }}
                    />
                  ) : (
                    (teacher.name || "Teacher")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>

                <strong>{teacher.name}</strong>

                <span className="comparison-rating">
                  <span aria-hidden="true">★</span>{" "}
                  {teacher.rating
                    ? Number(teacher.rating).toFixed(1)
                    : "N/A"}
                </span>
              </div>
            ))}
          </div>

          {comparisonFields
            .filter(([, key]) =>
              teachers.some(
                (teacher) =>
                  teacher[key] !== null &&
                  teacher[key] !== undefined &&
                  teacher[key] !== ""
              )
            )
            .map(([label, key]) => (
              <div
                className="comparison-row"
                key={key}
              >
                <div className="comparison-feature-label">
                  {label}
                </div>

                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="comparison-value"
                  >
                    {key === "studentCount"
                      ? formatStudents(teacher[key])
                      : key === "reviewCount"
                      ? formatReviews(teacher[key])
                      : key === "hourlyRate"
                      ? formatRate(teacher[key])
                      : key === "lessonDuration"
                      ? formatDuration(teacher[key])
                      : formatValue(teacher[key])}
                  </div>
                ))}
              </div>
            ))}
        </div>

        <div className="comparison-actions">
          <button
            className="comparison-secondary"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   TEACHER PROFILE
========================= */

function TeacherProfile({
  teacher,
  goBack,
  currentUser,
}) {
  const [showConsultation, setShowConsultation] =
    useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] =
    useState(true);
  const [reviewError, setReviewError] =
    useState("");
  const [reviewEligibility, setReviewEligibility] = useState({
    loading: true,
    eligible: false,
    alreadyReviewed: false,
    error: "",
  });

  const [reviewRating, setReviewRating] =
    useState(5);

  const [reviewText, setReviewText] =
    useState("");

  const [reviewSubmitting, setReviewSubmitting] =
    useState(false);

  const [consultSubmitting, setConsultSubmitting] =
    useState(false);

  const [consultMessage, setConsultMessage] =
    useState("");

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [videos, setVideos] = useState([]);
  const [videoLoading, setVideoLoading] =
    useState(true);
  const [selectedVideo, setSelectedVideo] =
    useState(null);
  const [profileImageFailed, setProfileImageFailed] =
    useState(false);
  const [videoImageErrors, setVideoImageErrors] =
    useState({});
  const [videoPlaybackError, setVideoPlaybackError] =
    useState(false);

  useEffect(() => {
    if (!teacher) return;

    setProfileImageFailed(false);
    setVideoPlaybackError(false);
    setVideoImageErrors({});

    try {
      const saved = JSON.parse(
        localStorage.getItem(FAVORITES_KEY) ||
          "[]"
      );

      setIsFavorite(saved.includes(teacher.id));
    } catch {
      setIsFavorite(false);
    }
  }, [teacher]);

  /* =========================
     LOAD REVIEWS
  ========================= */

  useEffect(() => {
    if (!teacher) return;

    async function loadReviews() {
      try {
        setReviewLoading(true);
        setReviewError("");

        const response = await fetch(
          `${API_URL}/teachers/${teacher.id}/reviews`
        );

        const data = await readResponse(response);

        setReviews(
          Array.isArray(data) ? data : []
        );
      } catch (err) {
        setReviewError(
          err.message || "Could not load reviews."
        );
      } finally {
        setReviewLoading(false);
      }
    }

    loadReviews();
  }, [teacher]);

  useEffect(() => {
    if (!teacher) return;

    let cancelled = false;

    async function checkReviewEligibility() {
      if (!currentUser?.token || currentUser?.role !== "STUDENT") {
        setReviewEligibility({
          loading: false,
          eligible: false,
          alreadyReviewed: false,
          error: "",
        });
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/teachers/${teacher.id}/reviews/eligibility`,
          { headers: { Authorization: `Bearer ${currentUser.token}` } }
        );
        const data = await readResponse(response);
        if (!cancelled) {
          setReviewEligibility({
            loading: false,
            eligible: Boolean(data?.eligible),
            alreadyReviewed: Boolean(data?.alreadyReviewed),
            error: "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setReviewEligibility({
            loading: false,
            eligible: false,
            alreadyReviewed: false,
            error: err.message || "Could not check review eligibility.",
          });
        }
      }
    }

    setReviewEligibility({
      loading: true,
      eligible: false,
      alreadyReviewed: false,
      error: "",
    });
    checkReviewEligibility();

    return () => { cancelled = true; };
  }, [teacher, currentUser]);

  /* =========================
     LOAD MULTIPLE VIDEOS
  ========================= */

  useEffect(() => {
    if (!teacher) return;

    async function loadVideos() {
      try {
        setVideoLoading(true);

        const response = await fetch(
          `${API_URL}/teachers/${teacher.id}/videos`
        );

        const data = await readResponse(response);

        const videoList = Array.isArray(data)
          ? data
          : [];

        setVideos(videoList);

        if (videoList.length > 0) {
          setSelectedVideo(videoList[0]);
        } else if (
          teacher.demoVideoUrl
        ) {
          setSelectedVideo({
            id: "legacy-demo",
            title: "Demo Class",
            description:
              "Teacher demo video.",
            videoUrl: teacher.demoVideoUrl,
            videoType:
              teacher.demoVideoType || "youtube",
            thumbnailUrl: "",
          });
        } else {
          setSelectedVideo(null);
        }
      } catch (err) {
        console.error(
          "Could not load teacher videos:",
          err
        );

        if (teacher.demoVideoUrl) {
          setVideos([
            {
              id: "legacy-demo",
              title: "Demo Class",
              description:
                "Teacher demo video.",
              videoUrl: teacher.demoVideoUrl,
              videoType:
                teacher.demoVideoType || "youtube",
              thumbnailUrl: "",
            },
          ]);

          setSelectedVideo({
            id: "legacy-demo",
            title: "Demo Class",
            description:
              "Teacher demo video.",
            videoUrl: teacher.demoVideoUrl,
            videoType:
              teacher.demoVideoType || "youtube",
            thumbnailUrl: "",
          });
        } else {
          setVideos([]);
          setSelectedVideo(null);
        }
      } finally {
        setVideoLoading(false);
      }
    }

    loadVideos();
  }, [teacher]);

  if (!teacher) {
    return (
      <div className="no-results">
        <h2>No teacher selected.</h2>

        <button
          className="primary-btn"
          onClick={goBack}
        >
          Back to Teachers
        </button>
      </div>
    );
  }

  function toggleProfileFavorite() {
    let saved = [];

    try {
      saved = JSON.parse(
        localStorage.getItem(FAVORITES_KEY) ||
          "[]"
      );
    } catch {
      saved = [];
    }

    const next = saved.includes(teacher.id)
      ? saved.filter(
          (id) => id !== teacher.id
        )
      : [...saved, teacher.id];

    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(next)
    );

    setIsFavorite(
      next.includes(teacher.id)
    );
  }

  async function submitConsultation(e) {
    e.preventDefault();

    setConsultSubmitting(true);
    setConsultMessage("");

    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    const body = {
      teacherId: teacher.id,
      studentName: String(
        form.get("studentName") || ""
      ).trim(),
      email: String(
        form.get("email") || ""
      ).trim(),
      phone: String(
        form.get("phone") || ""
      ).trim(),
      preferredDate: String(
        form.get("preferredDate") || ""
      ),
      preferredTime: String(
        form.get("preferredTime") || ""
      ),
      message: String(
        form.get("message") || ""
      ).trim(),
    };

    try {
      const response = await fetch(
        `${API_URL}/consultations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data =
        await readResponse(response);

      alert(
        data.message ||
          "Consultation request sent successfully!"
      );

      setShowConsultation(false);
      formElement.reset();
    } catch (err) {
      setConsultMessage(
        err.message ||
          "Could not send the consultation request."
      );
    } finally {
      setConsultSubmitting(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();

    if (!reviewText.trim()) {
      return;
    }
    if (!currentUser?.token || currentUser?.role !== "STUDENT") {
      setReviewError("Please log in with a Student account to submit a review.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");

    try {
      const response = await fetch(
        `${API_URL}/teachers/${teacher.id}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify({
            rating: Number(reviewRating),
            text: reviewText.trim(),
          }),
        }
      );

      const saved =
        await readResponse(response);

      setReviews((current) => [
        saved,
        ...current,
      ]);
      setReviewEligibility((current) => ({
        ...current,
        alreadyReviewed: true,
      }));

      setReviewText("");
      setReviewRating(5);
    } catch (err) {
      setReviewError(
        err.message ||
          "Could not submit the review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  function getYoutubeVideoId(video) {
    if (!video?.videoUrl) return "";

    const raw = String(video.videoUrl).trim();

    try {
      const parsed = new URL(
        raw.startsWith("http://") || raw.startsWith("https://")
          ? raw
          : `https://www.youtube.com/watch?v=${raw}`
      );

      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.replace(/^\//, "").split("/")[0];
      }

      if (parsed.searchParams.get("v")) {
        return parsed.searchParams.get("v");
      }

      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
    } catch {
      return raw.split("/").pop()?.split("?")[0] || "";
    }

    return "";
  }

  function isYoutubeVideo(video) {
    const url = String(video?.videoUrl || "").toLowerCase();
    return (
      video?.videoType === "youtube" ||
      url.includes("youtube.com") ||
      url.includes("youtu.be")
    );
  }

  function getVideoEmbedUrl(video) {
    if (!video?.videoUrl) return "";

    if (isYoutubeVideo(video)) {
      const videoId = getYoutubeVideoId(video);
      return videoId
        ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
        : "";
    }

    return String(video.videoUrl).trim();
  }

  function getVideoThumbnail(video) {
    if (video?.thumbnailUrl) return video.thumbnailUrl;

    const videoId = getYoutubeVideoId(video);
    return videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : "";
  }

  function scrollToVideo() {
    setTimeout(() => {
      document
        .querySelector(".demo-video-player")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  }

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* =========================
            CONSULTATION MODAL
        ========================= */}

        {showConsultation && (
          <div className="consultation-overlay">
            <div className="consultation-modal">
              <button
                className="close-consultation"
                onClick={() =>
                  setShowConsultation(false)
                }
              >
                ×
              </button>

              <h2>Request Consultation</h2>

              <p>
                Send a consultation request to{" "}
                {teacher.name}.
              </p>

              {consultMessage && (
                <div className="form-error">
                  {consultMessage}
                </div>
              )}

              <form
                onSubmit={submitConsultation}
              >
                <label>Student Name</label>

                <input
                  name="studentName"
                  type="text"
                  placeholder="Enter your name"
                  defaultValue={
                    currentUser?.name || ""
                  }
                  required
                />

                <label>Email</label>

                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  defaultValue={
                    currentUser?.email || ""
                  }
                  required
                />

                <label>Phone</label>

                <input
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                />

                <label>
                  Preferred Date
                </label>

                <input
                  name="preferredDate"
                  type="date"
                  required
                />

                <label>
                  Preferred Time
                </label>

                <input
                  name="preferredTime"
                  type="time"
                  required
                />

                <label>Message</label>

                <textarea
                  name="message"
                  placeholder="Tell the teacher what you would like to discuss..."
                  rows="4"
                />

                <button
                  type="submit"
                  className="submit-consultation"
                  disabled={
                    consultSubmitting
                  }
                >
                  {consultSubmitting
                    ? "Sending..."
                    : "Send Request"}
                </button>
              </form>
            </div>
          </div>
        )}

        <button
          className="back-home"
          onClick={goBack}
        >Back to Home</button>

        {/* =========================
            PROFILE HEADER
        ========================= */}

        <div className="profile-header">
          <div className={`profile-avatar ${
            teacher.profileImageUrl && !profileImageFailed
              ? "has-photo"
              : "has-initials"
          }`}>
            {teacher.profileImageUrl && !profileImageFailed ? (
              <img
                src={teacher.profileImageUrl}
                alt={`${teacher.name} profile`}
                loading="eager"
                onError={() => setProfileImageFailed(true)}
              />
            ) : (
              <span className="avatar-initials" aria-label={`${teacher.name} initials`}>
                {(teacher.name || "Teacher")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="profile-main-info">
            <div className="profile-name-row">
              <div>
                <div className="profile-name-line">
                  <h1>{teacher.name}</h1>

                  {teacher.verified && (
                    <span
                      className="verified-badge"
                      title="Verified Teacher"
                    >
                      ✓ Verified
                    </span>
                  )}
                </div>

                <p>{teacher.specialty}</p>
              </div>

              <button
                className="profile-favorite"
                onClick={
                  toggleProfileFavorite
                }
              >
                {isFavorite ? "♥" : "♡"}
              </button>
            </div>

            <div className="profile-tags">
              {teacher.category && (
                <span>{teacher.category}</span>
              )}

              {teacher.location && (
                <span>{teacher.location}</span>
              )}

              {typeof teacher.available === "boolean" && (
                <span className={teacher.available ? "availability-tag is-available" : "availability-tag"}>
                  <span className="availability-dot" aria-hidden="true" />
                  {teacher.available ? "Currently available" : "Currently unavailable"}
                </span>
              )}
            </div>

            <div className="profile-stat-row" aria-label="Teacher overview">
              {teacher.rating && (
                <div className="profile-stat">
                  <strong>{teacher.rating}</strong>
                  <span>Rating</span>
                </div>
              )}

              {teacher.reviewCount && (
                <div className="profile-stat">
                  <strong>{teacher.reviewCount}</strong>
                  <span>Reviews</span>
                </div>
              )}

              {teacher.experience && (
                <div className="profile-stat">
                  <strong>{teacher.experience}</strong>
                  <span>Experience</span>
                </div>
              )}

              {teacher.studentCount && (
                <div className="profile-stat">
                  <strong>{teacher.studentCount}+</strong>
                  <span>Students taught</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-layout">
          <div className="profile-left">

            {/* =========================
                ABOUT
            ========================= */}

            {teacher.bio && (
              <section className="profile-section">
                <h2>About the Teacher</h2>
                <p>{teacher.bio}</p>
              </section>
            )}

            {/* =========================
                QUALIFICATIONS
            ========================= */}

            {(teacher.qualification || teacher.experience || teacher.studentCount) && (
              <section className="profile-section">
                <div className="section-heading-block">
                  <span className="section-eyebrow">CREDENTIALS</span>
                  <h2>Qualifications & Experience</h2>
                </div>

                <div className="qualification-list">
                  {teacher.qualification && (
                    <div className="qualification-item">
                      <span className="qualification-marker">01</span>
                      <div>
                        <strong>Teaching Qualification</strong>
                        <p>{teacher.qualification}</p>
                      </div>
                    </div>
                  )}

                  {teacher.experience && (
                    <div className="qualification-item">
                      <span className="qualification-marker">02</span>
                      <div>
                        <strong>{teacher.experience} teaching experience</strong>
                        <p>Professional English teaching experience.</p>
                      </div>
                    </div>
                  )}

                  {teacher.studentCount && (
                    <div className="qualification-item">
                      <span className="qualification-marker">03</span>
                      <div>
                        <strong>{teacher.studentCount}+ students taught</strong>
                        <p>Previous learners supported through English classes.</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* =========================
                TEACHING STYLE
            ========================= */}

            {teacher.teachingStyle && (
              <section className="profile-section">
                <div className="section-heading-block">
                  <span className="section-eyebrow">APPROACH</span>
                  <h2>Teaching Style</h2>
                </div>

                <div className="style-card">
                  <div className="style-icon">STYLE</div>
                  <div>
                    <h3>{teacher.teachingStyle}</h3>
                    <p>
                      A quick look at this teacher's approach can help you decide whether the class is a good fit for your learner.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* =========================
                TEACHING DETAILS
            ========================= */}

            {(teacher.category || teacher.specialty || teacher.ageRange || teacher.teachingMode || teacher.languages || teacher.availability || typeof teacher.available === "boolean" || teacher.hourlyRate || teacher.lessonDuration) && (
              <section className="profile-section">
                <div className="section-heading-block">
                  <span className="section-eyebrow">CLASS INFORMATION</span>
                  <h2>Teaching Details</h2>
                </div>

                <div className="teaching-details-grid">
                {teacher.category && (
                  <div><span>Category</span><strong>{teacher.category}</strong></div>
                )}
                {teacher.specialty && (
                  <div><span>Specialty</span><strong>{teacher.specialty}</strong></div>
                )}
                {teacher.ageRange && (
                  <div><span>Age Range</span><strong>{teacher.ageRange}</strong></div>
                )}
                {teacher.teachingMode && (
                  <div><span>Teaching Mode</span><strong>{teacher.teachingMode}</strong></div>
                )}
                {teacher.languages && (
                  <div><span>Languages</span><strong>{teacher.languages}</strong></div>
                )}
                {(teacher.availability || typeof teacher.available === "boolean") && (
                  <div>
                    <span>Availability</span>
                    <strong>
                      {teacher.availability ||
                        (teacher.available ? "Available" : "Not available")}
                    </strong>
                  </div>
                )}
                {teacher.hourlyRate && (
                  <div><span>Hourly Rate</span><strong>₩{Number(teacher.hourlyRate).toLocaleString()}</strong></div>
                )}
                {teacher.lessonDuration && (
                  <div><span>Lesson Duration</span><strong>{teacher.lessonDuration}</strong></div>
                )}
              </div>
            </section>
            )}

            {/* =========================
                MULTIPLE DEMO VIDEOS
            ========================= */}

            <section className="profile-section">
              <div className="section-title-row">
                <div>
                  <h2>Demo Classes</h2>

                  <p>
                    Watch sample lessons before
                    choosing your teacher.
                  </p>
                </div>

                {videos.length > 0 && (
                  <div className="video-count">
                    {videos.length} Demo
                    {videos.length > 1
                      ? "s"
                      : ""}
                  </div>
                )}
              </div>

              {videoLoading && (
                <div className="review-card">
                  <p>
                    Loading demo videos...
                  </p>
                </div>
              )}

              {!videoLoading &&
                selectedVideo && (
                  <>
                    <div className="demo-video">
                      <div className="demo-play-area">
                        {videoPlaybackError ? (
                          <div className="video-error-state">
                            <strong>Demo video unavailable</strong>
                            <p>This video could not be loaded right now. Please try another demo.</p>
                            {videos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextVideo = videos.find((video) => video.id !== selectedVideo.id);
                                  if (nextVideo) {
                                    setSelectedVideo(nextVideo);
                                    setVideoPlaybackError(false);
                                  }
                                }}
                              >
                                Try another demo
                              </button>
                            )}
                          </div>
                        ) : isYoutubeVideo(selectedVideo) ? (
                          <iframe
                            className="demo-video-player"
                            src={getVideoEmbedUrl(selectedVideo)}
                            title={
                              selectedVideo.title ||
                              `Demo Class for ${teacher.name}`
                            }
                            frameBorder="0"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            onError={() => setVideoPlaybackError(true)}
                          />
                        ) : (
                          <video
                            className="demo-video-player"
                            controls
                            preload="metadata"
                            onError={() => setVideoPlaybackError(true)}
                          >
                            <source
                              src={selectedVideo.videoUrl}
                              type="video/mp4"
                            />
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>

                      <div className="selected-video-info">
                        <h3>
                          {selectedVideo.title || "Demo Class"}
                        </h3>

                        <p>
                          {selectedVideo.description || "Teacher demo video."}
                        </p>

                        <button
                          className="watch-demo-btn"
                          onClick={scrollToVideo}
                        >
                          Watch Demo Class →
                        </button>
                      </div>
                    </div>

                    {videos.length > 0 && (
                      <div className="demo-library">
                        <div className="demo-library-heading">
                          <div>
                            <strong>More demo classes</strong>
                            <span>{videos.length} {videos.length === 1 ? "demo available" : "demos available"}</span>
                          </div>
                          {videos.length > 1 && (
                            <span className="demo-library-hint">Select a lesson to watch it above</span>
                          )}
                        </div>

                        <div className="video-gallery">
                        {videos.map((video, index) => (
                          <button
                            type="button"
                            key={
                              video.id ||
                              index
                            }
                            className={`video-gallery-card ${
                              selectedVideo?.id ===
                              video.id
                                ? "video-gallery-active"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedVideo(video);
                              setVideoPlaybackError(false);
                              scrollToVideo();
                            }}
                          >
                            <div className="video-thumbnail">
                              {getVideoThumbnail(video) && !videoImageErrors[video.id || index] ? (
                                <img
                                  src={getVideoThumbnail(video)}
                                  alt={video.title || "Demo class thumbnail"}
                                  loading="lazy"
                                  onError={() =>
                                    setVideoImageErrors((current) => ({
                                      ...current,
                                      [video.id || index]: true,
                                    }))
                                  }
                                />
                              ) : (
                                <div className="video-thumbnail-fallback">
                                  <span>DEMO</span>
                                  <small>{isYoutubeVideo(video) ? "Video lesson" : "Teacher recording"}</small>
                                </div>
                              )}
                              <span className="video-play-badge" aria-hidden="true">▶</span>
                            </div>

                            <div className="video-gallery-info">
                              <strong>
                                {video.title ||
                                  `Demo ${index + 1}`}
                              </strong>

                              <span>
                                Watch sample →
                              </span>
                            </div>
                          </button>
                        ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

              {!videoLoading &&
                !selectedVideo && (
                  <div className="review-card">
                    <p>
                      No demo video is available
                      yet.
                    </p>
                  </div>
                )}

              <p className="demo-disclaimer">
                Demo lessons are shown here so families can understand a teacher's teaching approach.
                Only teacher-specific recordings should be published on verified teacher profiles.
              </p>
            </section>

            {/* =========================
                REVIEWS
            ========================= */}

            <section className="profile-section">
              <div className="section-title-row">
                <div>
                  <h2>Student Reviews</h2>

                  <p>
                    Reviews from the Pick My Teacher community.
                  </p>
                </div>

                <div className="review-summary">
                  {teacher.rating ? `${teacher.rating} rating` : "Rating unavailable"}
                </div>
              </div>

              {reviewLoading && (
                <div className="review-card">
                  <p>
                    Loading reviews...
                  </p>
                </div>
              )}

              {!reviewLoading &&
                reviewError && (
                  <div className="form-error">
                    {reviewError}
                  </div>
                )}

              {!reviewLoading &&
                !reviewError &&
                reviews.length === 0 && (
                  <div className="review-card">
                    <p>
                      No reviews yet.
                    </p>
                  </div>
                )}

              {!reviewLoading &&
                reviews.map((review) => (
                  <div
                    className="review-card"
                    key={review.id}
                  >
                    <div className="review-top">
                      <strong>
                        {review.studentName}
                      </strong>

                      <span>
                        {review.rating ? `${review.rating}/5` : "Rating unavailable"}
                      </span>
                    </div>

                    <p>{review.text}</p>

                    <small>
                      {review.createdAt
                        ? new Date(
                            review.createdAt
                          ).toLocaleDateString()
                        : ""}
                    </small>
                  </div>
                ))}

              <div className="review-form-card">
                <h3>Write a Review</h3>

                {reviewEligibility.loading ? (
                  <p>Checking review eligibility...</p>
                ) : !currentUser?.token || currentUser?.role !== "STUDENT" ? (
                  <p>Please log in with a Student account to write a review.</p>
                ) : reviewEligibility.error ? (
                  <div className="form-error">{reviewEligibility.error}</div>
                ) : reviewEligibility.alreadyReviewed ? (
                  <p>You have already reviewed this teacher. Thank you for sharing your experience!</p>
                ) : !reviewEligibility.eligible ? (
                  <p>You can write a review after this teacher approves your consultation request.</p>
                ) : (
                  <form onSubmit={submitReview}>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                      aria-label="Review rating"
                    >
                      <option value="5">5 / 5</option>
                      <option value="4">4 / 5</option>
                      <option value="3">3 / 5</option>
                      <option value="2">2 / 5</option>
                      <option value="1">1 / 5</option>
                    </select>

                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows="4"
                      maxLength={2000}
                      placeholder="Share your experience..."
                      required
                    />

                    <button
                      className="submit-consultation"
                      type="submit"
                      disabled={reviewSubmitting}
                    >
                      {reviewSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                )}
              </div>
            </section>
          </div>

          {/* =========================
              PROFILE SIDEBAR
          ========================= */}

          <aside className="profile-sidebar">
            <div className="booking-card">
              <h2>
                Interested in this teacher?
              </h2>

              <p>
                Contact the teacher before
                making your final decision.
              </p>

              <button
                className="consultation-btn"
                onClick={() =>
                  setShowConsultation(true)
                }
              >
                Request Consultation
              </button>

              <button
                className="compare-profile-btn"
                onClick={goBack}
              >
                Compare Teacher
              </button>
            </div>

            <div className="quick-info">
              <h3>Quick Information</h3>

              {teacher.category && (
                <div>
                  <span>Category</span>
                  <strong>{teacher.category}</strong>
                </div>
              )}

              {teacher.location && (
                <div>
                  <span>Location</span>
                  <strong>{teacher.location}</strong>
                </div>
              )}

              {teacher.hourlyRate && (
                <div>
                  <span>Hourly Rate</span>
                  <strong>₩{Number(teacher.hourlyRate).toLocaleString()}</strong>
                </div>
              )}

              {teacher.lessonDuration && (
                <div>
                  <span>Lesson</span>
                  <strong>{teacher.lessonDuration}</strong>
                </div>
              )}

              {teacher.teachingMode && (
                <div>
                  <span>Mode</span>
                  <strong>{teacher.teachingMode}</strong>
                </div>
              )}

              {teacher.verified === true && (
                <div>
                  <span>Verification</span>
                  <strong>Verified teacher</strong>
                </div>
              )}
            </div></aside>
        </div>
      </div>
    </div>
  );
}

/* =========================
   MAIN APP
========================= */

function StudentDashboard({
  currentUser,
  goToTeachers,
  handleLogout,
  onProfileUpdated,
}) {
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [studentDetails, setStudentDetails] = useState({ age:"", ageGroup:"", englishLevel:"", learningGoals:"", preferredCategory:"", interests:"", preferredSchedule:"", introduction:"", guardianName:"", guardianPhone:"" });
  const [studentDetailsNotice, setStudentDetailsNotice] = useState("");
  const [studentDetailsError, setStudentDetailsError] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [favoriteTeachers, setFavoriteTeachers] = useState([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [myLessons, setMyLessons] = useState([]);
  const [lessonError, setLessonError] = useState("");
  useEffect(() => {
    if (!currentUser?.token) return;
    fetch(`${API_URL}/lessons`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
      .then(readResponse).then(setMyLessons).catch((e) => setLessonError(e.message));
  }, [currentUser?.token]);
  useEffect(() => {
    try {
      const savedIds = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      if (!Array.isArray(savedIds) || savedIds.length === 0) return;
      fetch(`${API_URL}/teachers`)
        .then(readResponse)
        .then((data) => {
          const allTeachers = Array.isArray(data) ? data : (Array.isArray(data?.teachers) ? data.teachers : []);
          setFavoriteTeachers(allTeachers.filter((teacher) => savedIds.includes(teacher.id)));
        })
        .catch((e) => setFavoriteError(e.message));
    } catch {
      setFavoriteError("Could not load saved teachers.");
    }
  }, []);
  useEffect(() => {
    if (!currentUser?.token) return;
    fetch(`${API_URL}/workspace/student/consultations`, {
      headers: { Authorization: `Bearer ${currentUser.token}` }
    }).then(readResponse).then(setMyRequests).catch((e) => setRequestError(e.message));
  }, [currentUser?.token]);
  useEffect(() => {
    if (!currentUser?.token) return;
    fetch(`${API_URL}/workspace/student/profile`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
      .then(readResponse).then((data) => setStudentDetails((old) => ({ ...old, ...data })))
      .catch((e) => setStudentDetailsError(e.message));
  }, [currentUser?.token]);
  async function saveStudentDetails(e) {
    e.preventDefault(); setStudentDetailsNotice(""); setStudentDetailsError("");
    try {
      const response = await fetch(`${API_URL}/workspace/student/profile`, {
        method:"PUT", headers:{"Content-Type":"application/json",Authorization:`Bearer ${currentUser?.token || ""}`},
        body:JSON.stringify({ ...studentDetails, name:profileName.trim(), age:studentDetails.age ? Number(studentDetails.age) : null })
      });
      const saved = await readResponse(response);
      setStudentDetails((old)=>({...old,...saved}));
      setStudentDetailsNotice("Student learning profile saved.");
    } catch(e) { setStudentDetailsError(e.message || "Could not save student profile."); }
  }
  return (
    <main className="page">
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "50px 24px 80px",
        }}
      >
        <div
          style={{
            marginBottom: "32px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#6b7280",
              fontSize: "14px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Student Dashboard
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              lineHeight: 1.2,
            }}
          >
            Welcome,{" "}
            {currentUser?.name ||
              currentUser?.email ||
              "Student"}
            !
          </h1>

          <p
            style={{
              marginTop: "12px",
              color: "#6b7280",
              fontSize: "16px",
            }}
          >
            Manage your Pick My Teacher learning experience
            from one place.
          </p>
          <div style={{ marginTop: 16 }}>
            <NotificationCenter user={currentUser} />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div className="card">
            <div className="dashboard-card-label">ACCOUNT</div>
            <h3>My Profile</h3>
            {profileNotice && <p style={{ color: "#067647" }}>{profileNotice}</p>}
            {profileError && <p style={{ color: "#b42318" }}>{profileError}</p>}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setProfileNotice("");
              setProfileError("");
              if (!profileName.trim()) {
                setProfileError("Please enter your name.");
                return;
              }
              setProfileBusy(true);
              try {
                const response = await fetch(`${API_URL}/users/me`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentUser?.token || ""}`,
                  },
                  body: JSON.stringify({ name: profileName.trim() }),
                });
                const updated = await readResponse(response);
                onProfileUpdated?.(updated);
                setProfileName(updated.name || profileName.trim());
                setProfileNotice("Profile updated successfully.");
              } catch (err) {
                setProfileError(err.message || "Could not update your profile.");
              } finally {
                setProfileBusy(false);
              }
            }}>
              <label style={{ display: "block", marginBottom: 6 }}>Name</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)}
                maxLength={100} required style={{ width: "100%", marginBottom: 12 }} />
              <p><strong>Email:</strong> {currentUser?.email || "Not available"}</p>
              <p><strong>Account:</strong> Student</p>
              <button className="signup-btn" type="submit" disabled={profileBusy}>
                {profileBusy ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="dashboard-card-label">MY LEARNING</div>
            <h3>My Lessons ({myLessons.length})</h3>
            {lessonError && <p style={{color:"#b42318"}}>{lessonError}</p>}
            {myLessons.length === 0 ? <p style={{color:"#667085"}}>No lessons scheduled yet. Approved consultation lessons will appear here.</p> : myLessons.map((lesson) => <div key={lesson.id} style={{borderTop:"1px solid #eaecf0",padding:"12px 0"}}>
              <strong>{lesson.teacherName}</strong>
              <p style={{margin:"5px 0"}}>{new Date(lesson.scheduledAt).toLocaleString()} · {lesson.durationMinutes} minutes</p>
              <span style={{fontSize:13,fontWeight:600}}>{lesson.status}</span>
              {lesson.meetingLink && <p><a href={lesson.meetingLink} target="_blank" rel="noreferrer">Join lesson</a></p>}
              {lesson.status === "SCHEDULED" && <button type="button" className="compare-btn" onClick={async()=>{if(!window.confirm("Cancel this lesson?"))return;const reason=window.prompt("Optional cancellation reason:")||"";try{await readResponse(await fetch(`${API_URL}/lessons/${lesson.id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${currentUser.token}`},body:JSON.stringify({status:"CANCELLED",reason})}));setMyLessons(old=>old.map(x=>x.id===lesson.id?{...x,status:"CANCELLED",cancellationReason:reason}:x));}catch(e){setLessonError(e.message);}}}>Cancel lesson</button>}
            </div>)}
          </div>
          <div className="card">
            <div className="dashboard-card-label">LEARNING PROFILE</div>
            <h3>My Learning Profile</h3>
            {studentDetailsNotice && <p style={{color:"#067647"}}>{studentDetailsNotice}</p>}
            {studentDetailsError && <p style={{color:"#b42318"}}>{studentDetailsError}</p>}
            <form onSubmit={saveStudentDetails}>
              {[
                ["age","Age"],["ageGroup","Age group (Child / Teen / Adult)"],["englishLevel","Current English level"],["learningGoals","Learning goals"],["preferredCategory","Preferred English category"],["interests","Interests / hobbies"],["preferredSchedule","Preferred learning schedule"],["introduction","About me"],["guardianName","Parent / guardian name (if applicable)"],["guardianPhone","Parent / guardian phone (if applicable)"]
              ].map(([key,label])=><label key={key} style={{display:"block",marginTop:10}}>{label}{key==="learningGoals"||key==="interests"||key==="introduction"?<textarea rows={key==="introduction"?3:2} value={studentDetails[key]||""} onChange={e=>setStudentDetails(old=>({...old,[key]:e.target.value}))} style={{width:"100%",marginTop:5}}/>:<input type={key==="age"?"number":"text"} value={studentDetails[key]||""} onChange={e=>setStudentDetails(old=>({...old,[key]:e.target.value}))} style={{width:"100%",marginTop:5}}/>}</label>)}
              <button className="signup-btn" type="submit" style={{marginTop:14}}>Save Learning Profile</button>
            </form>
          </div>
          <div className="card">
            <div className="dashboard-card-label">DISCOVER</div>

            <h3>Find English Teachers</h3>

            <p>
              Explore English teachers for speaking,
              phonics, grammar, reading, storytelling
              and school English.
            </p>

            <button
              className="signup-btn"
              onClick={goToTeachers}
            >
              Find Teachers
            </button>
          </div>

          <div className="card">
            <div className="dashboard-card-label">REQUESTS</div>

            <h3>Consultations</h3>

            <p>
              Your consultation and lesson requests
              will appear here.
            </p>

            {requestError && <p style={{color:"#b42318"}}>{requestError}</p>}
            {myRequests.length === 0 ? <p style={{color:"#667085"}}>No demo class requests yet.</p> : myRequests.map((r) => (
              <p key={r.id} style={{padding:"8px 0",borderTop:"1px solid #eee"}}>
                <strong>{r.preferredDate} · {r.preferredTime}</strong><br />
                Status: {r.status}
                {r.rejectionReason && <><br/><b>Teacher's reason:</b> {r.rejectionReason}</>}
                {r.adminPreviousStatus && <><br/><b>Admin status change:</b> {r.adminPreviousStatus} → {r.status} {r.adminNote || ""}</>}{r.decisionHistory && <><br/><b>Decision History:</b><br/>{r.decisionHistory}</>}
              </p>
            ))}
          </div>

          <div className="card">
            <div className="dashboard-card-label">SAVED</div>

            <h3>Favorite Teachers</h3>

            {favoriteError && <p style={{ color: "#b42318" }}>{favoriteError}</p>}
            {favoriteTeachers.length === 0 ? (
              <p style={{ color: "#667085" }}>No favorite teachers saved yet. Browse teachers and tap the heart to save one.</p>
            ) : favoriteTeachers.map((teacher) => (
              <div key={teacher.id} style={{ padding: "10px 0", borderTop: "1px solid #eee" }}>
                <strong>{teacher.name}</strong>
                <p style={{ margin: "4px 0", color: "#667085" }}>{teacher.category} · {teacher.location}</p>
                <button className="login-btn" onClick={() => {
                  const next = favoriteTeachers.filter((item) => item.id !== teacher.id);
                  setFavoriteTeachers(next);
                  const ids = next.map((item) => item.id);
                  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
                }}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>English Learning Categories</h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            {[
              "Kids English",
              "Phonics",
              "Speaking",
              "Reading & Writing",
              "Grammar",
              "Storytelling",
              "School English",
            ].map((category) => (
              <span
                key={category}
                style={{
                  padding: "9px 14px",
                  borderRadius: "999px",
                  background: "#f3f4f6",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: "28px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            className="signup-btn"
            onClick={goToTeachers}
          >
            Browse Teachers
          </button>

          <button
            className="login-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </section>
    </main>
 );
}


function NotificationCenter({ user }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    if (!user?.token) return;
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await readResponse(response);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnread(Number(data?.unreadCount || 0));
      setError("");
    } catch (e) { setError(e.message || "Could not load notifications."); }
  }
  useEffect(() => { load(); }, [user?.token]);
  async function markRead(id) {
    try {
      await readResponse(await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PATCH", headers: { Authorization: `Bearer ${user?.token || ""}` }
      }));
      await load();
    } catch (e) { setError(e.message); }
  }
  async function markAllRead() {
    try {
      await readResponse(await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH", headers: { Authorization: `Bearer ${user?.token || ""}` }
      }));
      await load();
    } catch (e) { setError(e.message); }
  }
  async function deleteOne(id) {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await readResponse(await fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${user?.token || ""}` }
      }));
      await load();
    } catch (e) { setError(e.message); }
  }
  async function deleteAll() {
    if (!items.length || !window.confirm("Delete all your notifications? This cannot be undone.")) return;
    try {
      await readResponse(await fetch(`${API_URL}/notifications`, {
        method: "DELETE", headers: { Authorization: `Bearer ${user?.token || ""}` }
      }));
      await load();
    } catch (e) { setError(e.message); }
  }
  return <div className="notification-center" style={{ position: "relative" }}>
    <button type="button" className="login-btn" onClick={() => { setOpen(v => !v); if (!open) load(); }}
      aria-expanded={open} aria-label={`Notifications, ${unread} unread`}>
      Notifications {unread > 0 ? `(${unread})` : ""}
    </button>
    {open && <div style={{ position: "absolute", zIndex: 30, right: 0, top: "calc(100% + 8px)", width: "min(360px, 85vw)", maxHeight: 420, overflowY: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 12px 32px rgba(16,24,40,.16)", padding: 14 }}>
      <div className="notification-panel-heading">
        <div><strong>Notifications</strong><small>{unread} unread</small></div>
        <div className="notification-actions">
          <button type="button" onClick={markAllRead} disabled={!unread}>Read all</button>
          <button type="button" onClick={deleteAll} disabled={!items.length}>Delete all</button>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {!items.length && !error && <div className="notification-empty">You’re all caught up. No notifications yet.</div>}
      {items.map(item => <div key={item.id} className={`notification-item ${item.read ? "is-read" : "is-unread"}`}>
        <button type="button" className="notification-content" onClick={() => !item.read && markRead(item.id)}>
          <strong>{item.title}</strong>
          <span>{item.message}</span>
          <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""} · {item.read ? "Read" : "Unread"}</small>
        </button>
        <button type="button" className="notification-delete" onClick={() => deleteOne(item.id)} aria-label={`Delete notification: ${item.title}`}>Delete</button>
      </div>)}
    </div>}
  </div>;
}

function WorkspaceShell({ title, subtitle, user, onLogout, children }) {
  return (
    <main style={{ minHeight: "75vh", background: "#f5f7fb", padding: "42px 20px" }}>
      <section style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 28 }}>
          <div>
            <p style={{ color: "#2563eb", fontWeight: 800, letterSpacing: 1, margin: "0 0 8px" }}>PICK MY TEACHER · WORKSPACE</p>
            <h1 style={{ margin: 0, color: "#101828" }}>{title}</h1>
            <p style={{ color: "#667085", margin: "8px 0 0" }}>{subtitle} · {user?.email}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <NotificationCenter user={user} />
            <button className="login-btn" onClick={onLogout}>Log out</button>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function getYouTubeVideoId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v") || "";
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts") return parts[1] || "";
    }
  } catch (e) {}
  return "";
}

function TeacherWorkspace({ currentUser, handleLogout }) {
  const [profile, setProfile] = useState({ category: "Kids English", location: "Online", specialty: "", experience: "", teachingStyle: "Supportive & Interactive", qualification: "", bio: "", hourlyRate: "", lessonDuration: "30", languages: "English", ageRange: "Children", teachingMode: "Online", availability: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videos, setVideos] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonDrafts, setLessonDrafts] = useState({});
  const [lessonNotice, setLessonNotice] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token || ""}` };

  async function load() {
    try {
      const [p, v, c] = await Promise.all([
        fetch(`${API_URL}/workspace/teacher/profile`, { headers }),
        fetch(`${API_URL}/workspace/teacher/videos`, { headers }),
        fetch(`${API_URL}/workspace/teacher/consultations`, { headers })
      ]);
      const pd = await readResponse(p);
      if (pd && pd.profile !== "NOT_CREATED") setProfile(old => ({ ...old, ...pd }));
      setVideos(await readResponse(v));
      setConsultations(await readResponse(c));
      const lessonResponse = await fetch(`${API_URL}/lessons`, { headers });
      setLessons(await readResponse(lessonResponse));
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);
  function change(e) { setProfile(p => ({ ...p, [e.target.name]: e.target.value })); }
  async function saveProfile(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      let nextProfile = { ...profile };
      if (profileImage) {
        if (!profileImage.type.startsWith("image/") || profileImage.size > 5 * 1024 * 1024) throw new Error("Choose an image under 5 MB.");
        const signed = await readResponse(await fetch(`${API_URL}/workspace/teacher/profile-image/sign`, { method: "POST", headers }));
        const form = new FormData();
        form.append("file", profileImage);
        form.append("api_key", signed.apiKey);
        form.append("timestamp", String(signed.timestamp));
        form.append("public_id", signed.publicId);
        form.append("overwrite", "true");
        form.append("signature", signed.signature);
        const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body: form });
        const imageData = await readResponse(uploaded);
        nextProfile.profileImageUrl = imageData.secure_url;
      }
      const res = await fetch(`${API_URL}/workspace/teacher/profile`, { method: "PUT", headers, body: JSON.stringify({ ...nextProfile, hourlyRate: nextProfile.hourlyRate ? Number(nextProfile.hourlyRate) : null, lessonDuration: nextProfile.lessonDuration ? Number(nextProfile.lessonDuration) : null }) });
      await readResponse(res); setNotice("Profile saved. It is waiting for admin verification.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function updateConsultationStatus(id, status) {
    let rejectionReason = "";
    if (status === "REJECTED") {
      rejectionReason = window.prompt("Please explain why you are rejecting this request (this will be shared with the student):") || "";
      if (!rejectionReason.trim()) return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/workspace/teacher/consultations/${id}/status`, {
        method: "PATCH", headers, body: JSON.stringify({ status, rejectionReason })
      });
      await readResponse(response);
      setNotice(status === "APPROVED" ? "Consultation request approved." : "Consultation request rejected.");
      await load();
    } catch (e) { setError(e.message || "Could not update consultation request."); }
    finally { setBusy(false); }
  }
  async function scheduleLesson(consultation) {
    const draft = lessonDrafts[consultation.id] || {};
    if (!draft.scheduledAt) { setError("Choose a lesson date and time first."); return; }
    setBusy(true); setError(""); setLessonNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/lessons/from-consultation/${consultation.id}`, {
        method:"POST", headers,
        body:JSON.stringify({ scheduledAt:draft.scheduledAt, durationMinutes:Number(draft.durationMinutes || 30), meetingLink:draft.meetingLink || "", notes:draft.notes || "" })
      }));
      setLessonNotice("Lesson scheduled and student notified.");
      await load();
    } catch(e) { setError(e.message || "Could not schedule lesson."); }
    finally { setBusy(false); }
  }
  async function updateLesson(id, status) {
    setBusy(true); setError(""); setLessonNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/lessons/${id}/status`, { method:"PATCH", headers, body:JSON.stringify({status}) }));
      setLessonNotice(status === "COMPLETED" ? "Lesson marked completed." : "Lesson cancelled.");
      await load();
    } catch(e) { setError(e.message || "Could not update lesson."); }
    finally { setBusy(false); }
  }
  async function rescheduleLesson(lesson) {
    const value=window.prompt("Enter new date and time (YYYY-MM-DDTHH:mm):", lesson.scheduledAt?.slice(0,16) || "");
    if(!value) return;
    setBusy(true); setError(""); setLessonNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/lessons/${lesson.id}/reschedule`, {method:"PATCH",headers,body:JSON.stringify({scheduledAt:value})}));
      setLessonNotice("Lesson rescheduled."); await load();
    } catch(e) { setError(e.message || "Could not reschedule lesson."); }
    finally { setBusy(false); }
  }
  async function addVideo(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(`${API_URL}/workspace/teacher/videos`, { method: "POST", headers, body: JSON.stringify({ title: videoTitle, videoUrl, videoType: "youtube" }) });
      await readResponse(res); setVideoTitle(""); setVideoUrl(""); setNotice("Demo video added."); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function deleteVideo(id) {
    if (!window.confirm("Delete this demo video?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(`${API_URL}/workspace/teacher/videos/${id}`, { method: "DELETE", headers });
      await readResponse(res);
      setNotice("Demo video deleted.");
      await load();
    } catch (e) {
      setError(e.message || "Could not delete demo video.");
    } finally {
      setBusy(false);
    }
  }
  return <WorkspaceShell title="Teacher Dashboard" subtitle="Manage your teaching profile and demo lessons" user={currentUser} onLogout={handleLogout}>
    {notice && <p style={{ background: "#ecfdf3", color: "#067647", padding: 12, borderRadius: 10 }}>{notice}</p>}
    {lessonNotice && <p style={{background:"#ecfdf3",color:"#067647",padding:12,borderRadius:10}}>{lessonNotice}</p>}
    {error && <p style={{ background: "#fef3f2", color: "#b42318", padding: 12, borderRadius: 10 }}>{error}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
      <form className="card" onSubmit={saveProfile} style={{ padding: 24 }}>
        <h2>My Teacher Profile</h2>
        <label style={{display:"block",marginTop:12}}>Profile picture</label>
        {(imagePreview || profile.profileImageUrl) && <img src={imagePreview || profile.profileImageUrl} alt="Teacher profile preview" style={{width:112,height:112,objectFit:"cover",borderRadius:"50%",margin:"8px 0"}} />}
        <input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){setProfileImage(f);setImagePreview(URL.createObjectURL(f));}}} style={{display:"block",margin:"8px 0 16px"}} />
        <small style={{color:"#667085"}}>JPG, PNG or WebP · maximum 5 MB. Uploads securely to Cloudinary when you save.</small>
        <label>Teaching category</label><select name="category" value={profile.category} onChange={change}>{["Kids English","Phonics","Speaking","Reading & Writing","Grammar","Storytelling","School English"].map(x=><option key={x}>{x}</option>)}</select>
        {[
          ["location","Location / Online"],["specialty","Specialty"],["experience","Teaching experience"],["teachingStyle","Teaching style"],["qualification","Qualifications"],["bio","About your teaching"],["hourlyRate","Hourly rate"],["lessonDuration","Lesson duration (minutes)"],["languages","Languages"],["ageRange","Student age range"],["teachingMode","Teaching mode"],["availability","Availability"]
        ].map(([key,label])=><label key={key} style={{ display:"block", marginTop:12 }}>{label}{key==="bio" || key==="qualification" || key==="availability" ? <textarea name={key} value={profile[key] || ""} onChange={change} rows={key==="bio"?4:2} style={{ width:"100%", marginTop:6 }} /> : <input name={key} type={key==="hourlyRate"||key==="lessonDuration"?"number":"text"} value={profile[key] ?? ""} onChange={change} style={{ width:"100%", marginTop:6 }} />}</label>)}
        <button className="signup-btn" disabled={busy} style={{ marginTop:18 }}>{busy ? "Saving..." : "Save profile"}</button>
      </form>
      <div style={{ display:"grid", gap:20, alignContent:"start" }}>
        <form className="card" onSubmit={addVideo} style={{ padding:24 }}>
          <h2>Demo Videos ({videos.length}/2)</h2>
          <p style={{ color:"#667085" }}>Add up to two YouTube or public video links. Use your own teaching videos.</p>
          <label>Video title</label><input value={videoTitle} onChange={e=>setVideoTitle(e.target.value)} required style={{ width:"100%", margin:"6px 0 12px" }} />
          <label>Video URL</label><input type="url" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} required style={{ width:"100%", margin:"6px 0 12px" }} />
          <button className="signup-btn" disabled={busy || videos.length>=2}>{videos.length>=2?"Two videos added":busy?"Saving...":"Add demo video"}</button>
          {videos.map(v=>{const videoId=getYouTubeVideoId(v.videoUrl);return <div key={v.id} style={{padding:"12px 0",borderTop:"1px solid #eee"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><p style={{margin:"0 0 10px"}}><a href={v.videoUrl} target="_blank" rel="noreferrer">{v.title}</a></p><button type="button" disabled={busy} onClick={()=>deleteVideo(v.id)} style={{background:"#fff",color:"#b42318",border:"1px solid #fda29b",borderRadius:8,padding:"7px 12px",fontWeight:600,cursor:"pointer"}}>Delete</button></div>{videoId ? <iframe title={v.title} src={"https://www.youtube.com/embed/"+videoId} style={{width:"100%",aspectRatio:"16 / 9",border:0,borderRadius:12}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <p style={{color:"#667085"}}>Preview is unavailable for this link. <a href={v.videoUrl} target="_blank" rel="noreferrer">Watch video</a></p>}</div>})}
        </form>
        <div className="card" style={{ padding:24 }}>
          <h2>Lesson Calendar & Management</h2>
          {lessons.length===0 ? <p style={{color:"#667085"}}>Scheduled lessons will appear here.</p> : lessons.map(lesson=><div key={lesson.id} style={{borderTop:"1px solid #eee",padding:"12px 0"}}>
            <b>{lesson.studentName}</b><p>{new Date(lesson.scheduledAt).toLocaleString()} · {lesson.durationMinutes} min · <strong>{lesson.status}</strong></p>
            {lesson.meetingLink && <p><a href={lesson.meetingLink} target="_blank" rel="noreferrer">Meeting link</a></p>}
            {lesson.status==="SCHEDULED" && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button type="button" className="login-btn" disabled={busy} onClick={()=>rescheduleLesson(lesson)}>Reschedule</button>
              <button type="button" className="signup-btn" disabled={busy} onClick={()=>updateLesson(lesson.id,"COMPLETED")}>Mark completed</button>
              <button type="button" disabled={busy} onClick={()=>updateLesson(lesson.id,"CANCELLED")}>Cancel</button>
            </div>}
          </div>)}
        </div>
        <div className="card" style={{ padding:24 }}>
          <h2>Demo Class Requests</h2>
          {consultations.length===0 ? <p style={{color:"#667085"}}>No requests yet.</p> : consultations.map(c=><div key={c.id} style={{borderTop:"1px solid #eee",padding:"12px 0"}}><b>{c.studentName}</b><p>{c.preferredDate} · {c.preferredTime} · <strong>{c.status}</strong></p><p>{c.message}</p><button type="button" className="login-btn" onClick={()=>setSelectedStudent(selectedStudent===c.id?null:c.id)}>{selectedStudent===c.id?"Hide":"View"} Student Profile</button>{selectedStudent===c.id && <div style={{background:"#f8fafc",padding:12,borderRadius:10,marginTop:8}}><p><b>Email:</b> {c.studentProfile?.email || c.email}</p><p><b>Age / Group:</b> {c.studentProfile?.age || "—"} / {c.studentProfile?.ageGroup || "—"}</p><p><b>English Level:</b> {c.studentProfile?.englishLevel || "—"}</p><p><b>Learning Goals:</b> {c.studentProfile?.learningGoals || "—"}</p><p><b>Preferred Category:</b> {c.studentProfile?.preferredCategory || "—"}</p><p><b>Interests:</b> {c.studentProfile?.interests || "—"}</p><p><b>Schedule:</b> {c.studentProfile?.preferredSchedule || "—"}</p><p><b>About:</b> {c.studentProfile?.introduction || "—"}</p>{c.studentProfile?.guardianName && <p><b>Guardian:</b> {c.studentProfile.guardianName} · {c.studentProfile.guardianPhone}</p>}</div>}{c.rejectionReason && <p style={{color:"#b42318"}}><b>Teacher rejection reason:</b> {c.rejectionReason}</p>}{c.adminPreviousStatus && <p><b>Admin changed status:</b> {c.adminPreviousStatus} → {c.status} {c.adminNote || ""}</p>}{c.decisionHistory && <p style={{whiteSpace:"pre-line"}}><b>Decision History:</b>{"\\n"}{c.decisionHistory}</p>}{c.status==="PENDING" && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" className="signup-btn" disabled={busy} onClick={()=>updateConsultationStatus(c.id,"APPROVED")}>Approve</button><button type="button" disabled={busy} onClick={()=>updateConsultationStatus(c.id,"REJECTED")} style={{background:"#fff",color:"#b42318",border:"1px solid #fda29b",borderRadius:10,padding:"10px 16px",fontWeight:600,cursor:"pointer"}}>Reject</button></div>}
            {c.status==="APPROVED" && !lessons.some(l=>l.consultationId===c.id) && <div style={{background:"#f8fafc",padding:12,borderRadius:10,marginTop:10}}>
              <b>Schedule first lesson</b>
              <label style={{display:"block",marginTop:8}}>Date & time <input type="datetime-local" min={new Date().toISOString().slice(0,16)} value={lessonDrafts[c.id]?.scheduledAt||""} onChange={e=>setLessonDrafts(old=>({...old,[c.id]:{...old[c.id],scheduledAt:e.target.value}}))}/></label>
              <label style={{display:"block",marginTop:8}}>Duration <select value={lessonDrafts[c.id]?.durationMinutes||30} onChange={e=>setLessonDrafts(old=>({...old,[c.id]:{...old[c.id],durationMinutes:e.target.value}}))}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label>
              <label style={{display:"block",marginTop:8}}>Meeting link (optional) <input type="url" value={lessonDrafts[c.id]?.meetingLink||""} onChange={e=>setLessonDrafts(old=>({...old,[c.id]:{...old[c.id],meetingLink:e.target.value}}))}/></label>
              <button type="button" className="signup-btn" disabled={busy} style={{marginTop:10}} onClick={()=>scheduleLesson(c)}>Schedule lesson</button>
            </div>}</div>)}
        </div>
      </div>
    </div>
  </WorkspaceShell>;
}

function AdminWorkspace({ currentUser, handleLogout }) {
  const [teachers, setTeachers] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [consultationSearch, setConsultationSearch] = useState("");
  const [consultationFilter, setConsultationFilter] = useState("ALL");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token || ""}` };
  async function load() {
    try {
      const [t,c,all] = await Promise.all([
        fetch(`${API_URL}/workspace/admin/pending-teachers`, { headers }),
        fetch(`${API_URL}/workspace/admin/consultations`, { headers }),
        fetch(`${API_URL}/workspace/admin/teachers`, { headers })
      ]);
      setTeachers(await readResponse(t)); setConsultations(await readResponse(c)); setAllTeachers(await readResponse(all));
    } catch(e) { setError(e.message); }
  }
  useEffect(()=>{load();},[]);
  const filteredConsultations = consultations.filter((item) => {
    const matchesStatus = consultationFilter === "ALL" || item.status === consultationFilter;
    const term = consultationSearch.trim().toLowerCase();
    const matchesSearch = !term || [item.studentName, item.email, item.teacherName, item.status]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });
  const consultationCounts = consultations.reduce((counts, item) => {
    const key = item.status || "UNKNOWN";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  async function approve(id) {
    setError(""); setNotice("");
    try { await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${id}/approve`,{method:"POST",headers})); setNotice("Teacher approved."); await load(); }
    catch(e){setError(e.message);}
  }
  async function reject(id) {
    setError(""); setNotice("");
    if (!window.confirm("Reject this teacher application? The profile will be hidden, not deleted.")) return;
    try {
      await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${id}/reject`,{method:"POST",headers}));
      setNotice("Teacher application rejected and hidden.");
      await load();
    } catch(e) { setError(e.message); }
  }
  async function removeTeacherProfile(teacher) {
    const confirmation = window.prompt(`This removes ${teacher.name}'s public teacher profile while preserving the account and history. Type REMOVE to confirm:`);
    if (confirmation !== "REMOVE") return;
    setError(""); setNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${teacher.id}`, { method:"DELETE", headers }));
      setNotice(`${teacher.name}'s public teacher profile was removed. Account and history were preserved.`);
      await load();
    } catch(e) { setError(e.message || "Could not remove teacher profile."); }
  }

  async function restoreTeacherProfile(teacher) {
    if (!window.confirm(`Restore ${teacher.name}'s public profile and make it visible to students again?`)) return;
    setError(""); setNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${teacher.id}/restore`, { method:"POST", headers }));
      setNotice(`${teacher.name}'s public teacher profile was restored and published.`);
      await load();
    } catch(e) { setError(e.message || "Could not restore teacher profile."); }
  }
  async function setStatus(id,status) {
    const adminNote = window.prompt("Optional admin note explaining this status update:") || "";
    try {
      await readResponse(await fetch(`${API_URL}/workspace/admin/consultations/${id}/status`,{method:"PATCH",headers,body:JSON.stringify({status,adminNote})}));
      setNotice("Consultation status updated. Previous decision is retained in history.");
      await load();
    } catch(e){setError(e.message);}
  }
  return <WorkspaceShell title="Admin Dashboard" subtitle="Review teacher applications and manage requests" user={currentUser} onLogout={handleLogout}>
    {notice&&<p style={{background:"#ecfdf3",color:"#067647",padding:12,borderRadius:10}}>{notice}</p>}
    {error&&<p style={{background:"#fef3f2",color:"#b42318",padding:12,borderRadius:10}}>{error}</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      {[["Pending teachers",teachers.length],["Total consultations",consultations.length],["Pending",consultationCounts.PENDING||0],["Approved",consultationCounts.APPROVED||0],["Completed",consultationCounts.COMPLETED||0]].map(([label,value])=><div className="card" key={label} style={{padding:18}}><p style={{color:"#667085",fontSize:13,margin:0}}>{label}</p><strong style={{fontSize:28}}>{value}</strong></div>)}
    </div>
    <div className="card" style={{padding:24,marginBottom:20}}>
      <h2>Teacher Verification ({teachers.length})</h2>
      {teachers.length===0?<p style={{color:"#667085"}}>No pending teacher applications.</p>:teachers.map(t=><div key={t.id} style={{borderTop:"1px solid #eee",padding:"16px 0",display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
        <div><b>{t.name}</b><p>{t.category} · {t.location} · {t.experience}</p><p>{t.qualification}</p><p>{t.bio}</p></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="signup-btn" onClick={()=>approve(t.id)}>Approve teacher</button>
          <button className="login-btn" onClick={()=>reject(t.id)} style={{color:"#b42318"}}>Reject</button>
        </div>
      </div>)}
    </div>
    <div className="card admin-teacher-management" style={{padding:24,marginBottom:20}}>
      <div className="admin-section-heading"><div><p className="eyebrow">ACCOUNT OVERSIGHT</p><h2>Teacher Profile Management</h2><p>Manage public teacher listings without deleting account or lesson history.</p></div><span>{allTeachers.length} profiles</span></div>
      {allTeachers.length===0?<p className="empty-state">No teacher profiles found.</p>:allTeachers.map(t=><div className="admin-teacher-row" key={t.id}>
        <div><strong>{t.name}</strong><p>{t.category} · {t.location} · {t.experience}</p><small>{t.ownerEmail || "No linked email"}</small></div>
        <div className="admin-teacher-meta"><span className={t.verified && t.available ? "status-pill status-active" : "status-pill"}>{t.verified && t.available ? "Published" : t.available ? "Pending" : "Hidden"}</span>
        {t.available
          ? <button type="button" className="danger-outline-btn" onClick={()=>removeTeacherProfile(t)}>Remove profile</button>
          : <button type="button" className="signup-btn" onClick={()=>restoreTeacherProfile(t)}>Restore profile</button>}
        </div>
      </div>)}
    </div>
    <div className="card" style={{padding:24}}>
      <h2>Consultation Requests ({filteredConsultations.length} of {consultations.length})</h2>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"14px 0"}}>
        <input aria-label="Search consultations" placeholder="Search student or email" value={consultationSearch} onChange={e=>setConsultationSearch(e.target.value)} style={{flex:"1 1 220px",padding:11,border:"1px solid #ddd",borderRadius:9}} />
        <select aria-label="Filter consultation status" value={consultationFilter} onChange={e=>setConsultationFilter(e.target.value)} style={{padding:11,border:"1px solid #ddd",borderRadius:9}}>
          {["ALL","PENDING","APPROVED","REJECTED","COMPLETED"].map(status=><option key={status} value={status}>{status==="ALL"?"All statuses":status}</option>)}
        </select>
      </div>
      {filteredConsultations.length===0?<p style={{color:"#667085"}}>No matching consultation requests.</p>:filteredConsultations.map(c=><div key={c.id} style={{borderTop:"1px solid #eee",padding:"14px 0"}}>
        <b>{c.studentName}</b> · {c.email}<p>{c.preferredDate} · {c.preferredTime} · <strong>{c.status}</strong></p>
        <button className="login-btn" onClick={()=>setSelectedStudent(selectedStudent===c.id?null:c.id)}>{selectedStudent===c.id?"Hide":"View"} Student Profile</button>
        {selectedStudent===c.id && <div style={{background:"#f8fafc",padding:12,borderRadius:10,marginTop:8}}>
          <p><b>Age / Group:</b> {c.studentProfile?.age||"—"} / {c.studentProfile?.ageGroup||"—"}</p>
          <p><b>English Level:</b> {c.studentProfile?.englishLevel||"—"}</p><p><b>Learning Goals:</b> {c.studentProfile?.learningGoals||"—"}</p>
          <p><b>Preferred Category:</b> {c.studentProfile?.preferredCategory||"—"}</p><p><b>Interests:</b> {c.studentProfile?.interests||"—"}</p>
          <p><b>Schedule:</b> {c.studentProfile?.preferredSchedule||"—"}</p><p><b>About:</b> {c.studentProfile?.introduction||"—"}</p>
          {c.studentProfile?.guardianName&&<p><b>Guardian:</b> {c.studentProfile.guardianName} · {c.studentProfile.guardianPhone}</p>}
        </div>}
        {c.teacherDecision && <p><b>Teacher decision:</b> {c.teacherDecision} {c.teacherDecisionAt||""}</p>}
        {c.rejectionReason && <p style={{color:"#b42318"}}><b>Rejection reason:</b> {c.rejectionReason}</p>}
        {c.adminPreviousStatus && <p><b>Admin changed:</b> {c.adminPreviousStatus} → {c.status} · {c.adminNote||""} · {c.adminDecisionAt||""}</p>}{c.decisionHistory && <p style={{whiteSpace:"pre-line"}}><b>Decision History:</b>{"\\n"}{c.decisionHistory}</p>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>{["PENDING","APPROVED","REJECTED","COMPLETED"].map(s=><button key={s} className="login-btn" onClick={()=>setStatus(c.id,s)}>{s}</button>)}</div>
      </div>)}
    </div>
  </WorkspaceShell>;
}

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token");

  async function handleResetPassword(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("This password reset link is missing or invalid.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter your new password twice.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Unable to reset your password. The link may have expired."
        );
      }

      setMessage(
        "Your password has been reset successfully. You can now log in with your new password."
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    window.history.replaceState({}, "", "/");
    window.location.reload();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f8fafc",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "32px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "10px",
            }}
          >
            Pick My Teacher
          </div>

          <h1 style={{ margin: 0, fontSize: "30px" }}>
            Reset Your Password
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Enter a new password for your account.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#f0fdf4",
              color: "#15803d",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {!message && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                New Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />
            </div>

            <div style={{ marginBottom: "22px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                Confirm New Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter new password again"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="signup-btn"
              style={{
                width: "100%",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}

        {message && (
          <button
            type="button"
            onClick={goToLogin}
            className="signup-btn"
            style={{
              width: "100%",
              marginTop: "4px",
            }}
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}

function DownloadPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8f7f4", color: "#222", fontFamily: "Arial, sans-serif" }}>
      <header style={{ padding: "24px 7%", background: "#fff", borderBottom: "1px solid #eee" }}>
        <a href="/" style={{ color: "#222", textDecoration: "none", fontSize: 22, fontWeight: 800 }}>
          Pick My Teacher<span style={{ color: "#d88935" }}>.</span>
        </a>
      </header>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "70px 24px", display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center" }}>
        <div style={{ flex: "1 1 320px" }}>
          <p style={{ color: "#b87325", fontWeight: 700 }}>ANDROID APP · VERSION 1.0</p>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 58px)", lineHeight: 1.1, margin: "20px 0" }}>
            Your learning journey, one tap away.
          </h1>
          <p style={{ color: "#666", fontSize: 17, lineHeight: 1.8, marginBottom: 26 }}>
            Find the right English teacher for your learning goals with Pick My Teacher.
          </p>
          <a
            href="https://github.com/shormydas09-bit/seonbaeon-frontend/releases/download/v1.0/Pick-My-Teacher-v1.0.apk"
            style={{ display: "inline-block", background: "#222", color: "#fff", padding: "16px 24px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}
          >
            ↓ Download for Android
          </a>
          <p style={{ color: "#777", fontSize: 13, marginTop: 12 }}>APK · Android · Version 1.0</p>
        </div>

        <div style={{ flex: "1 1 260px", textAlign: "center", background: "#fff", padding: 30, borderRadius: 24, border: "1px solid #eee" }}>
          <img src="/pwa-512x512.png" alt="Pick My Teacher logo" style={{ width: 200, maxWidth: "80%", borderRadius: 24 }} />
          <h2 style={{ marginTop: 20 }}>Pick My Teacher</h2>
          <p style={{ color: "#777", marginTop: 8 }}>Know Your Teacher Before You Join</p>
        </div>
      </section>

      <section style={{ background: "#fff", padding: "45px 24px", textAlign: "center" }}>
        <h2>How to install</h2>
        <p style={{ color: "#666", marginTop: 12 }}>1. Download the APK file.</p>
        <p style={{ color: "#666", marginTop: 8 }}>2. Open it from your Downloads folder.</p>
        <p style={{ color: "#666", marginTop: 8 }}>3. Allow installation if your phone asks.</p>
        <p style={{ color: "#666", marginTop: 8 }}>4. Install and open Pick My Teacher.</p>
      </section>

      <footer style={{ padding: 24, textAlign: "center", color: "#888", fontSize: 13 }}>
        © Pick My Teacher
      </footer>
    </main>
  );
}
function App() {
  const [page, setPage] =
    useState("home");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [selectedTeacher, setSelectedTeacher] =
    useState(null);

  const [authMode, setAuthMode] =
    useState("login");

  const [currentUser, setCurrentUser] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(USER_KEY) ||
            "null"
        );
      } catch {
        return null;
      }
    });

  if (window.location.pathname === "/download") {
    return <DownloadPage />;
  }

  if (window.location.pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  function openLogin() {
    setAuthMode("login");
    setPage("auth");
  }

  function openSignup() {
    setAuthMode("signup");
    setPage("auth");
  }

  function handleLogin(user) {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );

    setCurrentUser(user);
    setPage(user.role === "TEACHER" ? "teacher-dashboard" : user.role === "ADMIN" ? "admin-dashboard" : "home");
  }

  function handleProfileUpdated(updated) {
    const nextUser = { ...currentUser, ...updated, token: currentUser?.token };
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setCurrentUser(nextUser);
  }

  function handleLogout() {
    if (currentUser?.token) {
      fetch(`${API_URL}/users/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentUser.token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(USER_KEY);

    setCurrentUser(null);
    setPage("home");
  }

  return (
    <div className="app">
      <nav className="navbar">
        <button
          className="logo logo-button"
          onClick={() =>
            setPage("home")
          }
        >
          Pick My Teacher<span>.</span>
        </button>

        <div className="nav-links">
          <button
            onClick={() =>
              setPage("home")
            }
          >
            Home
          </button>

          <button
            onClick={() =>
              setPage("teachers")
            }
          >
            Find Teachers
          </button>

          {currentUser && (
            <button
              onClick={() =>
                setPage("dashboard")
              }
            >
              Dashboard
            </button>
          )}

          <button
            onClick={() => {
              setPage("home");

              setTimeout(() => {
                document
                  .getElementById("how")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }, 0);
            }}
          >
            How It Works
          </button>

          <button
            onClick={() => {
              setPage("home");

              setTimeout(() => {
                document
                  .getElementById("home")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }, 0);
            }}
          >
            About
          </button>
        </div>

        <div className="nav-buttons">
          {currentUser ? (
            <>
              <button
                className="login-btn"
                onClick={() =>
                  setPage("dashboard")
                }
              >
                {currentUser.name ||
                  currentUser.email}
              </button>

              <button
                className="login-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="login-btn"
                onClick={openLogin}
              >
                Login
              </button>

              <button
                className="signup-btn"
                onClick={openSignup}
              >
                Get Started
              </button>
            </>
          )}
        </div>

        <button
          className={`mobile-menu-button ${
            mobileMenuOpen ? "mobile-menu-open" : ""
          }`}
          type="button"
          aria-label={
            mobileMenuOpen ? "Close navigation" : "Open navigation"
          }
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        {mobileMenuOpen && (
          <div className="mobile-nav-panel">
            <button onClick={() => { setPage("home"); setMobileMenuOpen(false); }}>
              Home
            </button>
            <button onClick={() => { setPage("teachers"); setMobileMenuOpen(false); }}>
              Find Teachers
            </button>
            {currentUser && (
              <button onClick={() => { setPage("dashboard"); setMobileMenuOpen(false); }}>
                Dashboard
              </button>
            )}
            <button
              onClick={() => {
                setPage("home");
                setMobileMenuOpen(false);
                setTimeout(() => {
                  document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
                }, 0);
              }}
            >
              How It Works
            </button>
            <div className="mobile-nav-divider" />
            {currentUser ? (
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                Logout
              </button>
            ) : (
              <>
                <button onClick={() => { openLogin(); setMobileMenuOpen(false); }}>
                  Login
                </button>
                <button
                  className="mobile-nav-primary"
                  onClick={() => { openSignup(); setMobileMenuOpen(false); }}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      {page === "home" && (
        <HomePage
          goToTeachers={() =>
            setPage("teachers")
          }
        />
      )}

      {page === "teachers" && (
        <TeacherSearch
          goHome={() =>
            setPage("home")
          }
          openProfile={(teacher) => {
            setSelectedTeacher(teacher);
            setPage("profile");
          }}
        />
      )}

      {page === "profile" && (
        <TeacherProfile
          teacher={selectedTeacher}
          currentUser={currentUser}
          goBack={() =>
            setPage("teachers")
          }
        />
      )}

      {page === "teacher-dashboard" && currentUser && (
        <TeacherWorkspace currentUser={currentUser} handleLogout={handleLogout} />
      )}

      {page === "admin-dashboard" && currentUser && (
        <AdminWorkspace currentUser={currentUser} handleLogout={handleLogout} />
      )}

      {page === "dashboard" && currentUser && currentUser.role === "TEACHER" && (
        <TeacherWorkspace currentUser={currentUser} handleLogout={handleLogout} />
      )}

      {page === "dashboard" && currentUser && currentUser.role === "ADMIN" && (
        <AdminWorkspace currentUser={currentUser} handleLogout={handleLogout} />
      )}

      {page === "dashboard" && currentUser && currentUser.role !== "TEACHER" && currentUser.role !== "ADMIN" && (
        <StudentDashboard
          currentUser={currentUser}
          goToTeachers={() =>
            setPage("teachers")
          }
          handleLogout={handleLogout}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {page === "auth" && (
        <AuthPage
          mode={authMode}
          setMode={setAuthMode}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}

export default App;


