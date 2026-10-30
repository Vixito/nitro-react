import { FC, MouseEvent, useMemo } from 'react';
import { FaFlag, FaTimes } from 'react-icons/fa';
import { Base, Column, ColumnProps, Flex } from '..';

interface NitroCardHeaderViewProps extends ColumnProps
{
    headerText: string;
    isGalleryPhoto?: boolean;
    noCloseButton?: boolean;
    onReportPhoto?: (event: MouseEvent) => void;
    onCloseClick: (event: MouseEvent) => void;
}

export const NitroCardHeaderView: FC<NitroCardHeaderViewProps> = props =>
{
    const { headerText = null, isGalleryPhoto = false, noCloseButton = false, onReportPhoto = null, onCloseClick = null, justifyContent = 'center', alignItems = 'center', classNames = [], children = null, ...rest } = props;

    const getClassNames = useMemo(() =>
    {
        const newClassNames: string[] = [ 'drag-handler', 'container-fluid', 'nitro-card-header' ];

        if(classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [ classNames ]);

    const onMouseDown = (event: MouseEvent<HTMLDivElement>) =>
    {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
    }

    return (
        <Column center position="relative" classNames={ getClassNames } { ...rest }>
            <Flex fullWidth center className="nitro-card-header-inner">
                <div className="shockwave-header-dots left" />
                <span className="nitro-card-header-text">
                    { headerText ? headerText.replace(/\bHabbos\b/gi, 'Habbten').replace(/\bHabbo\b/gi, 'Habbten') : '' }
                </span>
                <div className="shockwave-header-dots right" />
                <Flex center position="absolute" className="end-2" gap={ 1 }>
                    { children }
                    { isGalleryPhoto &&
                        <Base className="nitro-card-header-report-camera" onClick={ onReportPhoto }>
                            <FaFlag className="fa-icon" />
                        </Base>
                    }
                    { !noCloseButton &&
                        <Flex center className="nitro-card-header-close" onMouseDownCapture={ onMouseDown } onClick={ onCloseClick }>
                            <FaTimes className="fa-icon w-12 h-12" />
                        </Flex>
                    }
                </Flex>
            </Flex>
        </Column>
    );
}
