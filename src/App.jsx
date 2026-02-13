import React, { useEffect, useState } from 'react';
import { OracleRoute } from './oracle/ui/OracleRoute.jsx';

export default function App() {
  const [path, setPath] = useState(window.location.pathname || '/');

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div>
      <div className="oracle-nav">
        <button
          className="oracle-button secondary"
          onClick={() => {
            window.history.pushState({}, '', '/oracle');
            setPath('/oracle');
          }}
        >
          Go to /oracle
        </button>
      </div>
      {path === '/oracle' ? <OracleRoute /> : <OracleRoute />}
    </div>
  );
}
