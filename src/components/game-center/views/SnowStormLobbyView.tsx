import { FC, useCallback, useEffect, useState } from 'react';
import { Game2GetAccountGameStatusMessageComposer, JoinQueueMessageComposer } from '@nitrots/nitro-renderer';
import { CreateLinkEvent, LocalizeText, SendMessageComposer } from '../../../api';
import { Button, Column, DraggableWindow, DraggableWindowPosition, Flex, NitroCardContentView, NitroCardHeaderView, NitroCardView, Text } from '../../../common';
import { useGameCenter } from '../../../hooks';
import { useIsMobile } from '../../../hooks/mobile/useIsMobile';
import { HabboHeadImg } from './SnowStormAvatar';
import SnowStormLobbyImg from '../../../assets/images/gamecenter/snowstorm_lobby.png';
import SnowStormLogoImg from '../../../assets/images/gamecenter/snowstorm/thumbnails_Snowstorm_Logo.png';
import CloseUbuntuNormalImg from '../../../assets/images/eras/flash2012/skins/close_ubuntu_normal.png';
import CloseUbuntuHoverImg from '../../../assets/images/eras/flash2012/skins/close_ubuntu_hover.png';
import CloseUbuntuPressedImg from '../../../assets/images/eras/flash2012/skins/close_ubuntu_pressed.png';

interface LeaderboardEntry {
    rank: number;
    userId: number;
    username: string;
    figure: string;
    score: number;
    wins: number;
    gamesPlayed: number;
    hits: number;
    kos: number;
}

interface MatchHistoryItem {
    id: number;
    match_id: number;
    map_name: string;
    winner_team: string;
    blue_score: number;
    red_score: number;
    team: string;
    hits: number;
    kos: number;
    score: number;
    is_mvp_ko: number;
    is_mvp_hits: number;
    reward_credits: number;
    reward_duckets: number;
    created_at: number;
}

interface PlayerStatsSummary {
    total_score: number;
    weekly_score: number;
    games_played: number;
    wins: number;
    losses: number;
    total_hits: number;
    total_kos: number;
    total_throws: number;
}

export const SnowStormLobbyView: FC<{}> = () => {
    const {
        isSnowStormLobbyVisible,
        setIsSnowStormLobbyVisible,
        setIsVisible,
        setIsSnowStormPlaying,
        selectedGame,
        accountStatus
    } = useGameCenter();

    const [remainingGames, setRemainingGames] = useState<number>(5);
    const [hasUnlimited, setHasUnlimited] = useState<boolean>(false);
    const [penaltySeconds, setPenaltySeconds] = useState<number>(0);
    const [playerStats, setPlayerStats] = useState<PlayerStatsSummary | null>(null);
    const [userCredits, setUserCredits] = useState<number | null>(null);
    const [isStarting, setIsStarting] = useState<boolean>(false);
    const isMobile = useIsMobile();
    const [viewport, setViewport] = useState<{ w: number; h: number }>(() => ({
        w: typeof window !== 'undefined' ? window.innerWidth : 1280,
        h: typeof window !== 'undefined' ? window.innerHeight : 720
    }));

    useEffect(() => {
        const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const [selectedPack, setSelectedPack] = useState<10 | 100 | 300 | null>(null);
    const [isBuyConfirmOpen, setIsBuyConfirmOpen] = useState<boolean>(false);
    const [isBuying, setIsBuying] = useState<boolean>(false);
    const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
    const [lbTab, setLbTab] = useState<'week' | 'all' | 'friends' | 'history'>('week');
    const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
    const [historyMatches, setHistoryMatches] = useState<MatchHistoryItem[]>([]);
    const [lbLoading, setLbLoading] = useState<boolean>(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [toastError, setToastError] = useState<boolean>(false);

    const showToast = (msg: string, isError = false) => {
        setToastError(isError);
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3200);
    };

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/games/snowstorm/status', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.success) {
                setRemainingGames(data.games_left ?? 5);
                setHasUnlimited(!!data.has_unlimited);
                setPenaltySeconds(data.leave_penalty_seconds ?? 0);
                setPlayerStats(data.stats || null);
                if (data.user && typeof data.user.credits === 'number') {
                    setUserCredits(data.user.credits);
                }
            }
        } catch {
            // Keep defaults on transient error
        }
    }, []);

    const fetchLeaderboard = useCallback(async (tab: 'week' | 'all' | 'friends' | 'history') => {
        setLbLoading(true);
        try {
            if (tab === 'history') {
                const res = await fetch('/api/games/snowstorm/history', { credentials: 'include' });
                const data = await res.json();
                setHistoryMatches(data?.matches || []);
            } else {
                const period = tab === 'all' ? 'all' : 'week';
                const scope = tab === 'friends' ? 'friends' : 'global';
                const res = await fetch(`/api/games/snowstorm/leaderboard?period=${period}&scope=${scope}`, { credentials: 'include' });
                const data = await res.json();
                setLbEntries(data?.entries || []);
            }
        } catch {
            setLbEntries([]);
            setHistoryMatches([]);
        } finally {
            setLbLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isSnowStormLobbyVisible) {
            const gameId = selectedGame ? selectedGame.gameId : 0;
            SendMessageComposer(new Game2GetAccountGameStatusMessageComposer(gameId));
            fetchStatus();
        }
    }, [isSnowStormLobbyVisible, selectedGame, fetchStatus]);

    useEffect(() => {
        if (penaltySeconds <= 0) return;
        const timer = setInterval(() => {
            setPenaltySeconds(prev => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [penaltySeconds]);

    useEffect(() => {
        if (isLeaderboardOpen) {
            fetchLeaderboard(lbTab);
        }
    }, [isLeaderboardOpen, lbTab, fetchLeaderboard]);

    if (!isSnowStormLobbyVisible) return null;

    const onClose = () => {
        setIsSnowStormLobbyVisible(false);
    };

    const onPlayNow = async () => {
        if (isStarting) return;
        if (penaltySeconds > 0) {
            const mins = Math.floor(penaltySeconds / 60);
            const secs = String(penaltySeconds % 60).padStart(2, '0');
            showToast(`Penalización activa: espera ${mins}:${secs} para volver a jugar.`, true);
            return;
        }

        setIsStarting(true);
        try {
            const res = await fetch('/api/games/snowstorm/start', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                if (data.penalty_seconds) setPenaltySeconds(data.penalty_seconds);
                showToast(data.error || 'No se pudo iniciar SnowStorm.', true);
                setIsStarting(false);
                return;
            }

            if (typeof data.games_left === 'number') setRemainingGames(data.games_left);

            const gameId = selectedGame ? selectedGame.gameId : 0;
            SendMessageComposer(new JoinQueueMessageComposer(gameId));

            setIsSnowStormLobbyVisible(false);
            setIsVisible(false);
            setIsSnowStormPlaying(true);
        } catch {
            showToast('Error de conexión con el servidor de SnowStorm.', true);
        } finally {
            setIsStarting(false);
        }
    };

    const onHowToPlay = () => setIsHowToPlayOpen(true);

    const onLeaderboard = () => {
        setLbTab('week');
        setIsLeaderboardOpen(true);
    };

    const onGetHc = () => {
        CreateLinkEvent('habboUI/open/hccenter');
        CreateLinkEvent('catalog/open/habbo_club');
    };

    const onSelectPack = (pack: 10 | 100 | 300) => {
        setSelectedPack(pack);
        setIsBuyConfirmOpen(true);
    };

    const onConfirmBuy = async () => {
        if (!selectedPack || isBuying) return;
        setIsBuying(true);
        try {
            const res = await fetch('/api/games/snowstorm/buy-pack', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pack: selectedPack })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                showToast(data.error || 'Créditos insuficientes.', true);
            } else {
                setRemainingGames(data.games_left);
                if (typeof data.credits === 'number') setUserCredits(data.credits);
                showToast(`✓ ¡Has adquirido +${selectedPack} partidas!`);
            }
        } catch {
            showToast('Error al procesar la compra.', true);
        } finally {
            setIsBuying(false);
            setIsBuyConfirmOpen(false);
        }
    };

    const displayGames = (hasUnlimited || (accountStatus && accountStatus.hasUnlimitedGames)) ? '∞' : remainingGames;

    const packPrices: Record<number, number> = {
        10: 5,
        100: 30,
        300: 70
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = String(sec % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

    const maxLobbyW = Math.max(240, viewport.w - 16);
    const maxLobbyH = Math.max(220, viewport.h - (isMobile ? 76 : 24));
    const lobbyScale = Math.min(1, maxLobbyW / 410, maxLobbyH / 527);

    return (
        <>
            <DraggableWindow
                uniqueKey="snowstorm-lobby"
                handleSelector=".drag-handler"
                windowPosition={DraggableWindowPosition.CENTER}
            >
                <div
                    className="snowstorm-lobby-scale-wrap"
                    style={{
                        width: `${Math.round(410 * lobbyScale)}px`,
                        height: `${Math.round(527 * lobbyScale)}px`,
                        position: 'relative',
                        borderRadius: '6px',
                        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 0, 0, 0.4)',
                        overflow: 'hidden'
                    }}
                >
                <div
                    className="snowstorm-lobby-window"
                    style={{
                        width: '410px',
                        height: '527px',
                        backgroundImage: `url(${SnowStormLobbyImg})`,
                        backgroundSize: '410px 527px',
                        backgroundRepeat: 'no-repeat',
                        position: 'relative',
                        borderRadius: '6px',
                        imageRendering: 'pixelated',
                        userSelect: 'none',
                        overflow: 'hidden',
                        cursor: 'default',
                        transform: lobbyScale < 1 ? `scale(${lobbyScale})` : undefined,
                        transformOrigin: 'top left'
                    }}
                >
                    {/* Barra superior de arrastre */}
                    <div
                        className="drag-handler"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 'calc(100% - 34px)',
                            height: '28px',
                            cursor: 'move',
                            zIndex: 5
                        }}
                    />

                    {/* Botón cerrar X superior derecho */}
                    <div
                        className="snowstorm-lobby-close-btn"
                        onClick={onClose}
                        title="Cerrar ventana"
                        style={{
                            position: 'absolute',
                            top: '7px',
                            right: '7px',
                            width: '19px',
                            height: '20px',
                            backgroundImage: `url(${CloseUbuntuNormalImg})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundSize: '19px 20px',
                            cursor: 'pointer',
                            zIndex: 20
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundImage = `url(${CloseUbuntuHoverImg})`)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundImage = `url(${CloseUbuntuNormalImg})`)}
                        onMouseDown={e => (e.currentTarget.style.backgroundImage = `url(${CloseUbuntuPressedImg})`)}
                        onMouseUp={e => (e.currentTarget.style.backgroundImage = `url(${CloseUbuntuHoverImg})`)}
                    />

                    {/* Toast dentro del lobby */}
                    {toastMsg && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '38px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: toastError ? '#dc2626' : '#00d9cb',
                                color: toastError ? '#ffffff' : '#000000',
                                fontWeight: 'bold',
                                padding: '5px 14px',
                                borderRadius: '4px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                zIndex: 40,
                                fontSize: '11.5px',
                                whiteSpace: 'nowrap',
                                maxWidth: '380px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {toastMsg}
                        </div>
                    )}

                    {/* Aviso oficial de penalización de 2 minutos por abandonar partida */}
                    {penaltySeconds > 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '42px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(185, 28, 28, 0.94)',
                                color: '#ffffff',
                                border: '1px solid #fecaca',
                                borderRadius: '5px',
                                padding: '4px 12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                zIndex: 35,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 3px 10px rgba(0,0,0,0.45)'
                            }}
                        >
                            ⏱ Espera {formatTime(penaltySeconds)} (penalización por abandono)
                        </div>
                    )}

                    {/* Subtítulo dinámico */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '175px',
                            left: '0px',
                            width: '410px',
                            textAlign: 'center',
                            fontFamily: "'Ubuntu2012', 'Ubuntu', Tahoma, sans-serif",
                            fontSize: '12px',
                            color: '#14729f',
                            lineHeight: '1.28',
                            pointerEvents: 'none',
                            userSelect: 'none'
                        }}
                    >
                        ¡Enfréntate a otros Habbtens en unas<br />
                        épicas batallas de bolas de nieve!
                    </div>

                    {/* Enlace Cómo jugar */}
                    <div
                        onClick={onHowToPlay}
                        title="Cómo jugar a SnowStorm"
                        style={{
                            position: 'absolute',
                            top: '316px',
                            left: '164px',
                            width: '82px',
                            height: '18px',
                            cursor: 'pointer',
                            zIndex: 10,
                            borderRadius: '3px',
                            transition: 'background-color 0.12s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 168, 255, 0.16)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    />

                    {/* Enlace Clasificación */}
                    <div
                        onClick={onLeaderboard}
                        title="Ver Clasificación e Historial de SnowStorm"
                        style={{
                            position: 'absolute',
                            top: '351px',
                            left: '160px',
                            width: '88px',
                            height: '18px',
                            cursor: 'pointer',
                            zIndex: 10,
                            borderRadius: '3px',
                            transition: 'background-color 0.12s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 168, 255, 0.16)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    />

                    {/* Contador real de partidas restantes */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '404px',
                            left: '153px',
                            height: '14px',
                            lineHeight: '1',
                            display: 'flex',
                            alignItems: 'center',
                            fontFamily: "'Ubuntu2012', 'Ubuntu', Tahoma, sans-serif",
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#ffffff',
                            textShadow: '-1px -1px 0 #006a9e, 1px -1px 0 #006a9e, -1px 1px 0 #006a9e, 1px 1px 0 #006a9e, 0px 1px 0 #004c73',
                            letterSpacing: '-0.3px',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            zIndex: 7
                        }}
                    >
                        {displayGames}
                    </div>

                    {/* Enlace Club HC */}
                    <div
                        onClick={onGetHc}
                        title="Obtener partidas ilimitadas con el Club HC"
                        style={{
                            position: 'absolute',
                            top: '404px',
                            left: '204px',
                            width: '185px',
                            height: '28px',
                            cursor: 'pointer',
                            zIndex: 8,
                            borderRadius: '3px',
                            transition: 'filter 0.1s ease, transform 0.05s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.18)')}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                        onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
                        onMouseUp={e => (e.currentTarget.style.transform = 'none')}
                    />

                    {/* Botón comprar +10 */}
                    <div
                        onClick={() => onSelectPack(10)}
                        title="Comprar +10 partidas (5 créditos)"
                        style={{
                            position: 'absolute',
                            top: '451px',
                            left: '13px',
                            width: '52px',
                            height: '62px',
                            cursor: 'pointer',
                            zIndex: 8,
                            borderRadius: '4px',
                            boxShadow: selectedPack === 10 ? 'inset 0 0 0 2px #ffffff, 0 0 0 2px #006a9e' : 'none',
                            transition: 'filter 0.1s ease, transform 0.05s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; }}
                        onMouseUp={e => (e.currentTarget.style.transform = 'none')}
                    />

                    {/* Botón comprar +100 */}
                    <div
                        onClick={() => onSelectPack(100)}
                        title="Comprar +100 partidas (30 créditos)"
                        style={{
                            position: 'absolute',
                            top: '451px',
                            left: '73px',
                            width: '52px',
                            height: '62px',
                            cursor: 'pointer',
                            zIndex: 8,
                            borderRadius: '4px',
                            boxShadow: selectedPack === 100 ? 'inset 0 0 0 2px #ffffff, 0 0 0 2px #006a9e' : 'none',
                            transition: 'filter 0.1s ease, transform 0.05s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; }}
                        onMouseUp={e => (e.currentTarget.style.transform = 'none')}
                    />

                    {/* Botón comprar +300 */}
                    <div
                        onClick={() => onSelectPack(300)}
                        title="Comprar +300 partidas (70 créditos)"
                        style={{
                            position: 'absolute',
                            top: '451px',
                            left: '133px',
                            width: '52px',
                            height: '62px',
                            cursor: 'pointer',
                            zIndex: 8,
                            borderRadius: '4px',
                            boxShadow: selectedPack === 300 ? 'inset 0 0 0 2px #ffffff, 0 0 0 2px #006a9e' : 'none',
                            transition: 'filter 0.1s ease, transform 0.05s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'translateY(1px)'; e.currentTarget.style.filter = 'brightness(0.9)'; }}
                        onMouseUp={e => (e.currentTarget.style.transform = 'none')}
                    />

                    {/* Gran botón verde: ¡Jugar ahora! */}
                    <div
                        onClick={onPlayNow}
                        title={penaltySeconds > 0 ? `Espera ${formatTime(penaltySeconds)}` : '¡Entrar en la batalla de SnowStorm!'}
                        style={{
                            position: 'absolute',
                            top: '464px',
                            left: '206px',
                            width: '189px',
                            height: '48px',
                            cursor: penaltySeconds > 0 || isStarting ? 'not-allowed' : 'pointer',
                            zIndex: 8,
                            borderRadius: '6px',
                            backgroundColor: penaltySeconds > 0 ? 'rgba(0, 0, 0, 0.35)' : 'transparent',
                            transition: 'filter 0.1s ease, transform 0.05s ease'
                        }}
                        onMouseEnter={e => { if (penaltySeconds <= 0) e.currentTarget.style.filter = 'brightness(1.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                        onMouseDown={e => { if (penaltySeconds <= 0) { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.filter = 'brightness(0.85)'; } }}
                        onMouseUp={e => (e.currentTarget.style.transform = 'none')}
                    />
                </div>
                </div>
            </DraggableWindow>

            {/* Confirmación de compra real de partidas */}
            {isBuyConfirmOpen && selectedPack && (
                <NitroCardView uniqueKey="snowstorm-buy-games" theme="primary-slim" windowPosition={DraggableWindowPosition.CENTER} style={{ width: '340px', zIndex: 1100 }}>
                    <NitroCardHeaderView headerText={LocalizeText('snowwar.buy_more_games') || 'Compra más partidas'} onCloseClick={() => setIsBuyConfirmOpen(false)} />
                    <NitroCardContentView className="p-3">
                        <Column gap={2} alignItems="center">
                            <Text bold center style={{ fontSize: '13px' }}>
                                Pack de +{selectedPack} partidas de SnowStorm
                            </Text>
                            <Text center style={{ fontSize: '12.5px', color: '#1e293b' }}>
                                ¿Deseas adquirir este paquete por <strong className="text-dark">{packPrices[selectedPack]} créditos</strong>?
                                {userCredits !== null && <><br /><span style={{ color: '#475569' }}>Tu saldo actual: {userCredits} créditos</span></>}
                            </Text>
                            <hr className="w-100 my-1 bg-secondary" />
                            <Flex gap={2} fullWidth justifyContent="center">
                                <Button fullWidth variant="success" disabled={isBuying} onClick={onConfirmBuy}>
                                    {isBuying ? 'Comprando...' : (LocalizeText('catalog.purchase_confirmation.buy') || 'Comprar')}
                                </Button>
                                <Button fullWidth variant="secondary" disabled={isBuying} onClick={() => setIsBuyConfirmOpen(false)}>
                                    {LocalizeText('cancel') || 'Cancelar'}
                                </Button>
                            </Flex>
                        </Column>
                    </NitroCardContentView>
                </NitroCardView>
            )}

            {/* Cómo jugar a SnowStorm */}
            {isHowToPlayOpen && (
                <NitroCardView uniqueKey="snowstorm-howto" theme="primary-slim" windowPosition={DraggableWindowPosition.CENTER} style={{ width: '410px', zIndex: 1100 }}>
                    <NitroCardHeaderView headerText={LocalizeText('snowwar.instructions.link') || 'Cómo jugar a SnowStorm'} onCloseClick={() => setIsHowToPlayOpen(false)} />
                    <NitroCardContentView className="p-3">
                        <Column gap={2}>
                            <Text bold>{LocalizeText('gamecenter.snowwar.description_title') || '¡Ataca o te atacarán!'}</Text>
                            <Text small>{LocalizeText('gamecenter.snowwar.description_content') || 'Juega rápido y mantén la cabeza fría: lanza bolas de nieve al equipo rival, consigue K.O.s y gana recompensas y placas oficiales.'}</Text>
                            <hr className="my-1 bg-secondary" />
                            <Column gap={1}>
                                <Text small>• <b>Clic en el suelo</b> (o W A S D / Flechas): moverte por la arena.</Text>
                                <Text small>• <b>Clic sobre un rival</b>: lanzarle una bola de nieve directa.</Text>
                                <Text small>• <b>SHIFT + Clic</b>: lanzar una bola a una casilla vacía (tiro adelantado).</Text>
                                <Text small>• <b>CTRL + Clic</b> (o clic derecho): lanzamiento alto por encima de árboles y muros.</Text>
                                <Text small>• <b>Espacio / Botón verde</b>: agacharte para fabricar bolas (máx. 5) o acércate a la <b>Máquina de Nieve</b> central para recargar al instante.</Text>
                                <Text small>• <b>Puntuación oficial:</b> +1 punto por impacto, +5 puntos extra por K.O. (5 golpes). ¡Cada partida otorga Duckets, Créditos y progreso de logros!</Text>
                            </Column>
                            <Button fullWidth variant="primary" className="mt-2" onClick={() => setIsHowToPlayOpen(false)}>
                                {LocalizeText('snowwar.instructions.back') || 'Atrás'}
                            </Button>
                        </Column>
                    </NitroCardContentView>
                </NitroCardView>
            )}

            {/* Clasificación Real & Historial de SnowStorm (Estilo Habbo Official Leaderboard) */}
            {isLeaderboardOpen && (
                <NitroCardView uniqueKey="snowstorm-leaderboard" theme="primary-slim" windowPosition={DraggableWindowPosition.CENTER} style={{ width: '440px', zIndex: 1100 }}>
                    <NitroCardHeaderView headerText={LocalizeText('snowwar.leaderboards.link') || 'Clasificación de SnowStorm'} onCloseClick={() => setIsLeaderboardOpen(false)} />
                    <NitroCardContentView className="p-3" style={{ background: 'linear-gradient(180deg, #e7f5fc 0%, #d4eefb 100%)' }}>
                        <Column gap={2}>
                            {/* Tabs oficiales */}
                            <Flex gap={1} fullWidth>
                                {([
                                    ['week', 'Esta semana'],
                                    ['all', 'Histórico'],
                                    ['friends', 'Amigos'],
                                    ['history', 'Mis partidas']
                                ] as const).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setLbTab(key)}
                                        style={{
                                            flex: 1,
                                            padding: '5px 6px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            borderRadius: '4px',
                                            border: '1px solid #0e4a69',
                                            cursor: 'pointer',
                                            background: lbTab === key ? '#ffffff' : '#2d3748',
                                            color: lbTab === key ? '#0b4a6f' : '#ffffff',
                                            boxShadow: lbTab === key ? 'inset 0 2px 0 #bfe7fb' : 'none'
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </Flex>

                            {/* Resumen personal */}
                            {playerStats && (
                                <Flex justifyContent="between" alignItems="center" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid #a6cde0', borderRadius: '5px', padding: '5px 10px', fontSize: '11px', color: '#0f4c6e' }}>
                                    <span><b>Semana:</b> {playerStats.weekly_score} pts</span>
                                    <span><b>Victorias:</b> {playerStats.wins}/{playerStats.games_played}</span>
                                    <span><b>Impactos:</b> {playerStats.total_hits}</span>
                                    <span><b>K.O.s:</b> {playerStats.total_kos}</span>
                                </Flex>
                            )}

                            {/* Tabla con marca de agua oficial de SnowStorm */}
                            <div
                                style={{
                                    position: 'relative',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    border: '1px solid #9dc8df',
                                    borderRadius: '6px',
                                    minHeight: '250px',
                                    maxHeight: '300px',
                                    overflowY: 'auto'
                                }}
                            >
                                <img
                                    src={SnowStormLogoImg}
                                    alt=""
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '260px',
                                        height: 'auto',
                                        maxWidth: '84%',
                                        objectFit: 'contain',
                                        imageRendering: 'pixelated',
                                        opacity: 0.12,
                                        pointerEvents: 'none'
                                    }}
                                />

                                {lbLoading ? (
                                    <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
                                        Cargando registros de SnowStorm...
                                    </div>
                                ) : lbTab === 'history' ? (
                                    historyMatches.length === 0 ? (
                                        <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
                                            Aún no has completado partidas de SnowStorm. ¡Juega una para registrar tus récords y recompensas!
                                        </div>
                                    ) : (
                                        <table className="table table-sm m-0" style={{ fontSize: '11.5px', position: 'relative', zIndex: 2 }}>
                                            <thead style={{ background: '#d7eef9', color: '#0c4a6e' }}>
                                                <tr>
                                                    <th style={{ padding: '5px 8px' }}>Arena</th>
                                                    <th style={{ padding: '5px 6px', textAlign: 'center' }}>Resultado</th>
                                                    <th style={{ padding: '5px 6px', textAlign: 'center' }}>Pts</th>
                                                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>Recompensa</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historyMatches.map(m => {
                                                    const won = m.winner_team === m.team;
                                                    const draw = m.winner_team === 'draw';
                                                    return (
                                                        <tr key={m.id}>
                                                            <td style={{ padding: '5px 8px' }}>
                                                                <b>{m.map_name}</b>
                                                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                                    {m.hits} imp · {m.kos} K.O.
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '5px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                                <span style={{
                                                                    fontWeight: 800,
                                                                    fontSize: '10.5px',
                                                                    color: won ? '#15803d' : (draw ? '#b45309' : '#b91c1c')
                                                                }}>
                                                                    {won ? 'VICTORIA' : (draw ? 'EMPATE' : 'DERROTA')} ({m.blue_score}-{m.red_score})
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '5px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, color: '#0284c7' }}>
                                                                {m.score}
                                                            </td>
                                                            <td style={{ padding: '5px 8px', textAlign: 'right', verticalAlign: 'middle', fontSize: '10.5px', fontWeight: 700, color: '#0f766e' }}>
                                                                +{m.reward_duckets}D{m.reward_credits > 0 ? ` +${m.reward_credits}C` : ''}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )
                                ) : lbEntries.length === 0 ? (
                                    <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
                                        {lbTab === 'friends'
                                            ? 'Ninguno de tus amigos ha jugado esta semana todavía.'
                                            : '¡Sé el primero en marcar un récord en SnowStorm esta semana!'}
                                    </div>
                                ) : (
                                    <table className="table table-sm m-0" style={{ fontSize: '12px', position: 'relative', zIndex: 2 }}>
                                        <tbody>
                                            {lbEntries.map(entry => (
                                                <tr key={entry.userId} style={{ borderBottom: '1px solid #e2f0f8' }}>
                                                    <td style={{ width: '34px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, color: entry.rank === 1 ? '#d97706' : '#0369a1' }}>
                                                        {entry.rank}
                                                    </td>
                                                    <td style={{ width: '42px', padding: '3px 4px', verticalAlign: 'middle' }}>
                                                        <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <HabboHeadImg figure={entry.figure} direction={2} size={34} />
                                                        </div>
                                                    </td>
                                                    <td style={{ verticalAlign: 'middle' }}>
                                                        <div style={{ fontWeight: 700, color: '#0c4a6e' }}>{entry.username}</div>
                                                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                                                            {entry.wins} victorias · {entry.hits} impactos · {entry.kos} K.O.s
                                                        </div>
                                                    </td>
                                                    <td style={{ width: '78px', textAlign: 'right', verticalAlign: 'middle', paddingRight: '10px', fontWeight: 900, fontSize: '13.5px', color: '#0284c7' }}>
                                                        {entry.score.toLocaleString('es-ES')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <Button fullWidth variant="secondary" onClick={() => setIsLeaderboardOpen(false)}>
                                {LocalizeText('generic.close') || 'Cerrar'}
                            </Button>
                        </Column>
                    </NitroCardContentView>
                </NitroCardView>
            )}
        </>
    );
};
