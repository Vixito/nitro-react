import { FC, useEffect, useState } from 'react';

export const OnlineThermometerWidgetView: FC<{}> = props =>
{
    const [onlineCount, setOnlineCount] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();
                if (data.success) setOnlineCount(data.online);
            } catch (err) {
                console.error("Error fetching online stats", err);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, []);

    // Assuming a max capacity of 100 for visual testing, or dynamic?
    // Let's use 100 for now.
    const maxCapacity = 100;
    const percentage = Math.min(100, Math.max(0, (onlineCount / maxCapacity) * 100));

    return (
        <div style={{ position: 'relative', width: '30px', height: '150px', background: 'rgba(0, 0, 0, 0.5)', border: '2px solid rgba(255, 255, 255, 0.8)', borderRadius: '15px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
            {/* Thermometer Fill */}
            <div style={{ width: '100%', height: `${percentage}%`, background: 'linear-gradient(to top, #ff4d4d, #ffb84d)', transition: 'height 1s ease-in-out' }}></div>
            {/* Online Count Text overlay */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontWeight: 'bold', textShadow: '1px 1px 2px black', fontSize: '12px' }}>
                {onlineCount}
            </div>
            {/* Thermometer Bulb */}
            <div style={{ position: 'absolute', bottom: '-10px', width: '40px', height: '40px', background: '#ff4d4d', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.8)', zIndex: 2 }}></div>
        </div>
    );
}
