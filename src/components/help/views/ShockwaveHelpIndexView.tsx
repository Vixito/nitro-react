import { FC } from 'react';
import { OpenUrl, ReportState, ReportType } from '../../../api';
import { useHelp } from '../../../hooks';
import helpIcon3D from '../../../assets/images/eras/shockwave_v14/help_3d_blue.png';

export const ShockwaveHelpIndexView: FC<{ onClose: () => void }> = ({ onClose }) =>
{
    const { setActiveReport = null } = useHelp();

    const onEmergencyClick = () =>
    {
        setActiveReport(prevValue =>
        {
            const currentStep = ReportState.SELECT_USER;
            const reportType = ReportType.BULLY;

            return { ...prevValue, currentStep, reportType };
        });
    };

    const openTopic = (url: string) =>
    {
        if(url && url.startsWith('http'))
        {
            OpenUrl(url);
        }
    };

    return (
        <div className="shockwave-help-index">
            <div className="help-emergency-section">
                <img src={ helpIcon3D } alt="" className="help-blue-icon" />
                <div className="help-emergency-text">
                    ¿Tienes problemas? <span className="help-emergency-link" onClick={ onEmergencyClick }>¡Pide ayuda aquí!</span>
                </div>
            </div>

            <div className="help-topics-container">
                <div className="help-topics-title">Temas de ayuda</div>
                <div className="help-topics-list">
                    <div className="help-topic-item" onClick={ () => openTopic('https://habbten.com') }>
                        Visita guiada
                    </div>
                    <div className="help-topic-item" onClick={ () => openTopic('https://habbten.com') }>
                        Centro de Atención (tus dudas resueltas)
                    </div>
                    <div className="help-topic-item" onClick={ () => openTopic('https://habbten.com') }>
                        Invita a tus amigos
                    </div>
                    <div className="help-topic-item" onClick={ () => openTopic('https://habbten.com') }>
                        Términos de Servicio
                    </div>
                    <div className="help-topic-item" onClick={ () => openTopic('https://habbten.com') }>
                        Declaración de Privacidad
                    </div>
                </div>
            </div>

            <div className="help-actions-row">
                <div className="shockwave-btn-ok" onClick={ onClose }>
                    OK
                </div>
            </div>
        </div>
    );
};
