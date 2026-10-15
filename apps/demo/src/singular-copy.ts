import type {CopyKey} from './copy';
import type {Language} from './language';
// Count-one forms for languages whose nouns change. Japanese and Korean need no override.
export const singularCopy:Partial<Record<CopyKey,Partial<Record<Language,string>>>>={
 'common.people_count':{en:'{n} person',fr:'{n} personne',nl:'{n} persoon',es:'{n} persona'},
 'common.days_count':{en:'{n} day',fr:'{n} jour',nl:'{n} dag',es:'{n} día'},
 'posted.added':{en:'Added to {n} atelier',fr:'Ajouté à {n} atelier',nl:'Toegevoegd aan {n} atelier',es:'Añadido a {n} atelier'},
 'demo.posts.continue':{en:'Record in {n} selected atelier',fr:'Enregistrer dans {n} atelier sélectionné',nl:'Vastleggen in {n} gekozen atelier',es:'Registrar en {n} atelier seleccionado'},
 'demo.area.days':{en:'{n} day',fr:'{n} jour',nl:'{n} dag',es:'{n} día'},
 'demo.area.records':{en:'{n} recorded region',fr:'{n} zone enregistrée',nl:'{n} vastgelegd vlak',es:'{n} zona registrada'},
 'demo.draft.count':{en:'{n} photo in this preview',fr:'{n} photo dans cet aperçu',nl:'{n} foto in dit voorbeeld',es:'{n} foto en esta vista previa'},
 'demo.shared.members':{fr:'{n} personne / capacité {cap}',nl:'{n} deelnemer / capaciteit {cap}',es:'{n} participante / capacidad {cap}'},
 'push.almost.title':{en:'{n} contribution to go',fr:'Encore {n} contribution',nl:'Nog {n} bijdrage',es:'Falta {n} contribución'},
 'push.almost.body':{en:'{atelier} needs {n} more contribution to complete today.',fr:'Il manque {n} contribution dans {atelier} pour ce jour.',nl:'Er ontbreekt nog {n} bijdrage in {atelier} voor vandaag.',es:'Falta {n} contribución en {atelier} para completar el día.'},
};
