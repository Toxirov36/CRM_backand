import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EskizService {
    private token: string;

    async login() {
        try {
            const response = await axios.post(
                'https://notify.eskiz.uz/api/auth/login',
                {
                    email: process.env.ESKIZ_EMAIL,
                    password: process.env.ESKIZ_PASSWORD,
                },
            );

            this.token = response.data.data.token;

            return this.token;
        } catch (error) {
            console.log('ERROR:', error.response?.data);
            console.log('STATUS:', error.response?.status);
            console.log('MESSAGE:', error.message);

            throw error;
        }
    }

    async sendSms(phone: string, message: string) {
        if (!this.token) {
            await this.login();
        }

        return axios.post(
            'https://notify.eskiz.uz/api/message/sms/send',
            {
                mobile_phone: phone,
                message,
                from: '4546',
            },
            {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                },
            },
        );
    }
}
