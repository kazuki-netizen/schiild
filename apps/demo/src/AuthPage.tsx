import React from 'react';
import {t} from './copy';
import LanguageSelect from './LanguageSelect';
import type {Language} from './language';
import LineSignIn from './LineSignIn';
export default function AuthPage({language,onLanguage}:{language:Language;onLanguage:(value:Language)=>void}){
 return <section className="account-page auth-page" data-testid="auth-page"><h1>{t('demo.auth.title')}</h1><p>{t('demo.auth.line_required')}</p><LineSignIn required/><LanguageSelect value={language} onChange={onLanguage}/></section>;
}
