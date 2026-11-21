import { ILinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { AddEventLinkTracker, GetSessionDataManager, RemoveLinkEventTracker } from '../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../common';
import noteBlueImg from '../../assets/images/eras/flash2012/bulletin/note_blue.png';
import notePinkImg from '../../assets/images/eras/flash2012/bulletin/note_pink.png';
import noteYellowImg from '../../assets/images/eras/flash2012/bulletin/note_yellow.png';
import pushpinGreenImg from '../../assets/images/eras/flash2012/bulletin/pushpin_green.png';
import closeBulletinImg from '../../assets/images/eras/flash2012/bulletin/close_bulletin.png';

interface BulletinArticle
{
    id: number;
    title: string;
    shortStory: string;
    fullStory: string;
    image: string;
    category: string;
    createdAt: number;
}

interface BulletinEvent
{
    color: 'red' | 'blue';
    title: string;
    desc: string;
    time: string;
}

interface BulletinPayload
{
    username: string;
    year: number;
    month: number;
    today: number;
    articles: BulletinArticle[];
    eventsByDay: Record<string, BulletinEvent[]>;
}

const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DAY_NAMES_ES = [ 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado' ];
const ARTICLES_PER_PAGE = 3;

function formatArticleDate(unixSec: number): string
{
    const d = new Date(unixSec * 1000);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${ dd }-${ mm }-${ yyyy }`;
}

export const BulletinBoardView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ data, setData ] = useState<BulletinPayload | null>(null);
    const [ selectedDay, setSelectedDay ] = useState<number>(new Date().getDate());
    const [ page, setPage ] = useState<number>(1);
    const [ activeArticle, setActiveArticle ] = useState<BulletinArticle | null>(null);

    const loadBulletin = useCallback(async () =>
    {
        try
        {
            const res = await fetch('/api/client/bulletin', { credentials: 'include' });
            const json = await res.json();
            if(json && json.success)
            {
                setData(json as BulletinPayload);
                setSelectedDay(Number(json.today || new Date().getDate()));
            }
        }
        catch
        {
            // Ignore
        }
    }, []);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;
                switch(parts[1])
                {
                    case 'show':
                    case 'open':
                        setActiveArticle(null);
                        setPage(1);
                        setIsVisible(true);
                        loadBulletin();
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible(prev =>
                        {
                            const next = !prev;
                            if(next)
                            {
                                setActiveArticle(null);
                                setPage(1);
                                loadBulletin();
                            }
                            return next;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'bulletin/'
        };

        AddEventLinkTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [ loadBulletin ]);

    if(!isVisible) return null;

    const now = new Date();
    const year = data?.year ?? now.getFullYear();
    const month = data?.month ?? now.getMonth();
    const today = data?.today ?? now.getDate();
    const username = data?.username || GetSessionDataManager()?.userName || 'Habbten';
    const articles = data?.articles || [];
    const totalPages = Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageArticles = articles.slice((currentPage - 1) * ARTICLES_PER_PAGE, currentPage * ARTICLES_PER_PAGE);

    // Build Monday-first 6-week calendar grid
    const firstDayDate = new Date(year, month, 1);
    const startOffset = (firstDayDate.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const calendarCells: { day: number; inMonth: boolean }[] = [];
    for(let i = 0; i < totalCells; i++)
    {
        if(i < startOffset)
        {
            calendarCells.push({ day: daysInPrevMonth - startOffset + i + 1, inMonth: false });
        }
        else if(i < startOffset + daysInMonth)
        {
            calendarCells.push({ day: i - startOffset + 1, inMonth: true });
        }
        else
        {
            calendarCells.push({ day: i - (startOffset + daysInMonth) + 1, inMonth: false });
        }
    }

    const selectedDateObj = new Date(year, month, selectedDay);
    const selectedDayName = DAY_NAMES_ES[selectedDateObj.getDay()];
    const dayEvents = (data?.eventsByDay && data.eventsByDay[String(selectedDay)]) || [];

    return (
        <DraggableWindow uniqueKey="bulletin-board" handleSelector=".bulletin-drag-handle" windowPosition={ DraggableWindowPosition.CENTER }>
            <div className="bulletin-board-window">
                <div className="bulletin-titlebar bulletin-drag-handle">
                    <div className="bulletin-dots" />
                    <span className="bulletin-title-text">Tablón de Anuncios</span>
                    <div className="bulletin-dots" />
                    <button
                        type="button"
                        className="bulletin-close-btn"
                        aria-label="Cerrar"
                        onMouseDown={ e => e.stopPropagation() }
                        onClick={ () => setIsVisible(false) }
                    >
                        <img src={ closeBulletinImg } alt="Cerrar" className="bulletin-close-ico" />
                    </button>
                </div>

                <div className="bulletin-cork-body">
                    <div className="bulletin-left-col">
                        <div className="bulletin-welcome-card">
                            <div className="bulletin-welcome-text">
                                <div className="bulletin-welcome-hi">¡Bienvenid@, { username }!</div>
                                <p>Nos alegra tenerte de vuelta. Consulta las últimas noticias del hotel y los eventos de este mes.</p>
                                <div className="bulletin-welcome-sub">¡La comunidad siempre está primero!</div>
                            </div>
                            <img src={ noteBlueImg } alt="" width={ 37 } height={ 37 } className="bulletin-note is-blue" />
                            <img src={ notePinkImg } alt="" width={ 37 } height={ 37 } className="bulletin-note is-pink" />
                            <img src={ noteYellowImg } alt="" width={ 39 } height={ 37 } className="bulletin-note is-yellow" />
                        </div>

                        <div className="bulletin-news-panel">
                            <div className="bulletin-news-corner" />
                            <div className="bulletin-news-header">
                                <span className="bulletin-news-brand">HABBTEN HOY</span>
                                <div className="bulletin-news-rule" />
                            </div>
                            <div className="bulletin-news-subrule" />

                            { activeArticle ? (
                                <div className="bulletin-article-reader">
                                    <button type="button" className="bulletin-back-btn" onClick={ () => setActiveArticle(null) }>
                                        ← Volver a noticias
                                    </button>
                                    <div className="bulletin-reader-title">{ activeArticle.title }</div>
                                    <div className="bulletin-reader-date">{ formatArticleDate(activeArticle.createdAt) }</div>
                                    <div className="bulletin-reader-body">{ activeArticle.fullStory }</div>
                                </div>
                            ) : (
                                <>
                                    <div className="bulletin-news-list">
                                        { pageArticles.map(article => (
                                            <div key={ article.id } className="bulletin-news-card">
                                                <div
                                                    className="bulletin-news-thumb"
                                                    style={ { backgroundImage: `url('${ article.image }')` } }
                                                />
                                                <div className="bulletin-news-content">
                                                    <div className="bulletin-news-title">{ article.title }</div>
                                                    <div className="bulletin-news-excerpt">{ article.shortStory }</div>
                                                    <div className="bulletin-news-meta">
                                                        <span>{ formatArticleDate(article.createdAt) }</span>
                                                        <button
                                                            type="button"
                                                            className="bulletin-read-link"
                                                            onClick={ () => setActiveArticle(article) }
                                                        >
                                                            Leer artículo
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )) }
                                    </div>

                                    <div className="bulletin-news-pager">
                                        <button
                                            type="button"
                                            disabled={ currentPage <= 1 }
                                            onClick={ () => setPage(p => Math.max(1, p - 1)) }
                                        >
                                            Recientes
                                        </button>
                                        <span>Página { currentPage }</span>
                                        <button
                                            type="button"
                                            disabled={ currentPage >= totalPages }
                                            onClick={ () => setPage(p => Math.min(totalPages, p + 1)) }
                                        >
                                            Antiguos
                                        </button>
                                    </div>
                                </>
                            ) }
                        </div>
                    </div>

                    <div className="bulletin-right-col">
                        <div className="bulletin-cal-header">
                            <span className="bulletin-cal-line" />
                            <span className="bulletin-cal-month">{ MONTH_NAMES_ES[month] }, { year }</span>
                            <span className="bulletin-cal-line" />
                        </div>

                        <div className="bulletin-cal-grid-wrap">
                            <div className="bulletin-cal-weekdays">
                                <span>LUN</span><span>MAR</span><span>MIE</span><span>JUE</span><span>VIE</span><span>SAB</span><span>DOM</span>
                            </div>
                            <div className="bulletin-cal-grid">
                                { calendarCells.map((cell, idx) =>
                                {
                                    const evs = cell.inMonth ? (data?.eventsByDay?.[String(cell.day)] || []) : [];
                                    const isSelected = cell.inMonth && cell.day === selectedDay;
                                    const isToday = cell.inMonth && cell.day === today;

                                    return (
                                        <button
                                            key={ idx }
                                            type="button"
                                            disabled={ !cell.inMonth }
                                            className={ `bulletin-cal-cell ${ !cell.inMonth ? 'is-muted' : '' } ${ isSelected ? 'is-selected' : '' } ${ isToday ? 'is-today' : '' }` }
                                            onClick={ () => cell.inMonth && setSelectedDay(cell.day) }
                                        >
                                            <span className="cal-num">{ cell.day }</span>
                                            { evs.length > 0 && (
                                                <span className="cal-dots">
                                                    { evs.slice(0, 4).map((ev, eIdx) => (
                                                        <i key={ eIdx } className={ `cal-dot is-${ ev.color }` } />
                                                    )) }
                                                </span>
                                            ) }
                                        </button>
                                    );
                                }) }
                            </div>
                        </div>

                        <div className="bulletin-day-card">
                            <img src={ pushpinGreenImg } alt="" width={ 30 } height={ 34 } className="bulletin-pushpin" />
                            <div className="bulletin-day-head">
                                <div className="bulletin-day-num">{ selectedDay }</div>
                                <div className="bulletin-day-name">{ selectedDayName }</div>
                            </div>
                            <div className="bulletin-day-events">
                                { dayEvents.length === 0 ? (
                                    <div className="bulletin-no-events">Sin eventos programados para hoy.</div>
                                ) : (
                                    dayEvents.map((ev, idx) => (
                                        <div key={ idx } className="bulletin-event-row">
                                            <span className={ `bulletin-ev-sq is-${ ev.color }` } />
                                            <div className="bulletin-ev-info">
                                                <div className="bulletin-ev-title">{ ev.title }</div>
                                                <div className="bulletin-ev-desc">{ ev.desc }</div>
                                                <div className="bulletin-ev-time">{ ev.time }</div>
                                            </div>
                                        </div>
                                    ))
                                ) }
                            </div>
                            <div className="bulletin-day-fold" />
                        </div>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};
