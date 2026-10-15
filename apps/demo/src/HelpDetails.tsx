import React from 'react';
import {t} from './copy';
import type {CopyKey} from './copy';

// DEMO ONLY. Keep optional explanations available without crowding the work.
export default function HelpDetails({label='demo.help.rules',children}:{label?:CopyKey;children:React.ReactNode}){
 return <details className="help-details"><summary>{t(label)}</summary><div className="help-content">{children}</div></details>;
}
