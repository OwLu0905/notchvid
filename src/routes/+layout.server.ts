import { SIDEBAR_COOKIE_NAME } from '$lib/components/ui/sidebar/constants';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const openState = cookies.get(SIDEBAR_COOKIE_NAME);
	return {
		sidebar: openState === 'true'
	};
};
