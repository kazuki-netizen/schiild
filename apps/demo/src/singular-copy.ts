import type {CopyKey} from './copy';
import type {Language} from './language';
// Count-one forms for languages whose nouns change. Japanese and Korean need no override.
export const singularCopy:Partial<Record<CopyKey,Partial<Record<Language,string>>>>={
 'home.card.recorded':{it:"Oggi ha registrato una foto {n} persona su {cap}",en:'{n} of {cap} has recorded a photo today',fr:'{n} sur {cap} a enregistré une photo aujourd’hui',nl:'{n} van {cap} heeft vandaag een foto vastgelegd',es:'{n} de {cap} ha registrado una foto hoy'},
 'atelier.recorded':{it:"Oggi ha registrato una foto {n} persona su {cap}",en:'{n} of {cap} has recorded a photo today',fr:'{n} sur {cap} a enregistré une photo aujourd’hui',nl:'{n} van {cap} heeft vandaag een foto vastgelegd',es:'{n} de {cap} ha registrado una foto hoy'},
 'atelier.almost':{it:"Manca ancora {n} persona",en:'Waiting for {n} more person',fr:'Encore {n} personne pour compléter la journée',nl:'Nog {n} persoon te gaan',es:'Falta {n} persona por registrar su foto'},
 'common.people_count':{it:"{n} persona",en:'{n} person',fr:'{n} personne',nl:'{n} persoon',es:'{n} persona'},
 'common.days_count':{it:"{n} giorno",en:'{n} day',fr:'{n} jour',nl:'{n} dag',es:'{n} día'},
 'posted.added':{it:"Aggiunto a {n} atelier",en:'Added to {n} atelier',fr:'Ajouté à {n} atelier',nl:'Toegevoegd aan {n} atelier',es:'Añadido a {n} atelier'},
 'demo.posts.continue':{it:"Registra in {n} atelier selezionato",en:'Record in {n} selected atelier',fr:'Enregistrer dans {n} atelier sélectionné',nl:'Vastleggen in {n} gekozen atelier',es:'Registrar en {n} atelier seleccionado'},
 'demo.area.days':{it:"{n} giorno",en:'{n} day',fr:'{n} jour',nl:'{n} dag',es:'{n} día'},
 'demo.area.records':{it:"{n} zona registrata",en:'{n} recorded region',fr:'{n} zone enregistrée',nl:'{n} vastgelegd vlak',es:'{n} zona registrada'},
 'demo.draft.count':{it:"{n} foto in questa anteprima",en:'{n} photo in this preview',fr:'{n} photo dans cet aperçu',nl:'{n} foto in dit voorbeeld',es:'{n} foto en esta vista previa'},
 'demo.shared.members':{it:"{n} partecipante / {cap} posti",fr:'{n} personne / capacité {cap}',nl:'{n} deelnemer / capaciteit {cap}',es:'{n} participante / capacidad {cap}'},
 'push.almost.title':{it:"Manca {n} foto",en:'{n} contribution to go',fr:'Encore {n} contribution',nl:'Nog {n} bijdrage',es:'Falta {n} contribución'},
 'push.almost.body':{it:"A {atelier} manca {n} foto per completare la giornata.",en:'{atelier} needs {n} more contribution to complete today.',fr:'Il manque {n} contribution dans {atelier} pour ce jour.',nl:'Er ontbreekt nog {n} bijdrage in {atelier} voor vandaag.',es:'Falta {n} contribución en {atelier} para completar el día.'},
};
