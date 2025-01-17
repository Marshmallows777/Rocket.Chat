import { Meteor } from 'meteor/meteor';
import type { ServerMethods } from '@rocket.chat/ui-contexts';
import type { IMessage } from '@rocket.chat/core-typings';
import { Messages } from '@rocket.chat/models';

import { settings } from '../../settings/server';
import { isTheLastMessage } from '../../lib/server';
import { canAccessRoomAsync, roomAccessAttributes } from '../../authorization/server';
import { Subscriptions, Rooms } from '../../models/server';
import { Apps, AppEvents } from '../../../ee/server/apps/orchestrator';

declare module '@rocket.chat/ui-contexts' {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface ServerMethods {
		starMessage(message: Omit<IMessage, 'starred'> & { starred: boolean }): boolean;
	}
}

Meteor.methods<ServerMethods>({
	async starMessage(message) {
		const uid = Meteor.userId();

		if (!uid) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'starMessage',
			});
		}

		if (!settings.get('Message_AllowStarring')) {
			throw new Meteor.Error('error-action-not-allowed', 'Message starring not allowed', {
				method: 'starMessage',
				action: 'Message_starring',
			});
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(message.rid, uid, {
			fields: { _id: 1 },
		});
		if (!subscription) {
			return false;
		}
		if (!(await Messages.findOneByRoomIdAndMessageId(message.rid, message._id))) {
			return false;
		}

		const room = Rooms.findOneById(message.rid, { fields: { ...roomAccessAttributes, lastMessage: 1 } });

		if (!(await canAccessRoomAsync(room, { _id: uid }))) {
			throw new Meteor.Error('not-authorized', 'Not Authorized', { method: 'starMessage' });
		}

		if (isTheLastMessage(room, message)) {
			Rooms.updateLastMessageStar(room._id, uid, message.starred);
		}

		await Apps.triggerEvent(AppEvents.IPostMessageStarred, message, Meteor.user(), message.starred);

		await Messages.updateUserStarById(message._id, uid, message.starred);

		return true;
	},
});
