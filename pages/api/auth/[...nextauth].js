import NextAuth from 'next-auth';
import { authOptions } from '../../../lib/authConfig';

export default NextAuth(authOptions);
