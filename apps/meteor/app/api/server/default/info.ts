import { API } from '../api';
import { getServerInfo } from '../lib/getServerInfo';

API.default.addRoute(
	'info',
	{ authRequired: false },
	{
		async get() {
			const user = this.getLoggedInUser();

			return API.v1.success(await getServerInfo(user?._id));
		},
	},
);

API.default.addRoute(
	'ecdh_proxy/initEncryptedSession',
	{ authRequired: false },
	{
		post() {
			return {
				statusCode: 200,
				body: {
					success: false,
					error: 'Not Acceptable',
				},
			};
		},
	},
);
