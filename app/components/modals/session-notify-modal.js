import classic from 'ember-classic-decorator';
import { action, computed } from '@ember/object';
import ModalBase from 'open-event-frontend/components/modals/modal-base';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

let mailPromise = null;

@classic
export default class SessionNotifyModal extends ModalBase {
  @service loader;
  @tracked mails = null;
  @tracked saving = false;
  @tracked subject = '';
  @tracked message = '';
  @tracked cc = '';
  
  speakerEmails =  computed(function(){
    const session = this.store.peekRecord('session', this.sessionId, { backgroundReload: false });
    return session.speakers.map(speaker => `${speaker.name} ${speaker.email}`).join(', ');
  })

  constructor() {
    super(...arguments);
    this.initialize();
  }

  @computed('mails', 'saving')
  get loading() {
    return !this.mails || this.saving;
  }

  @computed('mails', 'sessionState')
  get mail() {
    if (!this.mails) {return null}
    const mail =  this.mails[this.sessionState];

    this.subject = mail.subject;
    this.message = mail.message.replace(/<br\/>/g, '\n'); // Convert line breaks to newlines for display

    return mail;
  }

  async initialize() {
    if (!mailPromise) {
      mailPromise = this.loader.load('/sessions/mails');
    }
    this.mails = await mailPromise;
    const session = this.store.peekRecord('session', this.sessionId, { backgroundReload: false });
    this.speakerEmails = session.speakers.map(speaker => `${speaker.name} ${speaker.email}`).join(', ');
  }

  @action
  async notifySession() {
    const { subject, message } = this.mail;
    const payload = {};

    if (subject !== this.subject) {
      payload.subject = this.subject;
    }

    const newMessage = this.message.replace(/\n/g, '<br/>'); // Convert newlines to line breaks for HTML email
    if (message !== newMessage) {
      payload.message = newMessage;
    }

    this.saving = true;
    try {
      const response = await this.loader.post(`/sessions/${this.sessionId}/notify`, payload);
      if (!response?.success) {throw response}
      this.notify.success(this.l10n.t('Email scheduled to be sent successfully'), {
        id: 'notify_email_succ'
      });
      this.close();
    } catch (e) {
      console.error('Error while sending session state change email', e);
      this.notify.error(this.l10n.t('An unexpected error has occurred.'), {
        id: 'notify_email_err'
      });
    } finally {
      this.saving = false;
    }
  }

}
