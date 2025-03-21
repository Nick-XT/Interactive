'use client';
import axios, { AxiosError } from 'axios';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import React, { FormEvent, ReactNode, useEffect, useState, useRef } from 'react';
import { ReCAPTCHA } from 'react-google-recaptcha';
import AuthCard from '@/components/layout/AuthCard';
import { toTitleCase } from '@/components/layout/dynamic-form/DynamicForm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import OAuth from '@/components/auth/OAuth';

export default function Register(): ReactNode {
  const formRef = useRef(null);
  const router = useRouter();
  const additionalFields = ['first_name', 'last_name'];
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const submitForm = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && !captcha) {
      setResponseMessage('Please complete the reCAPTCHA.');
      return;
    }
    const formData = Object.fromEntries(new FormData((event.currentTarget as HTMLFormElement) ?? undefined));
    if (getCookie('invitation')) {
      formData['invitation_id'] = getCookie('invitation') ?? ''.toString();
    }
    let registerResponse;
    let registerResponseData;
    try {
      // TODO fix the stupid double submission.
      registerResponse = await axios
        .post(`${process.env.NEXT_PUBLIC_AGIXT_SERVER}/v1/user`, {
          ...formData,
        })
        .catch((exception: AxiosError) => {
          console.error('AUTH REQUEST ERROR');
          console.error(exception);
          return exception.response;
        });
      registerResponseData = registerResponse?.data;
    } catch (exception) {
      console.error('ERROR OCCURRED DURING AUTH PROCESS');
      console.error(exception);
      registerResponse = null;
    }
    setResponseMessage(registerResponseData?.detail);
    const loginParams = [];
    if (registerResponseData?.otp_uri) {
      loginParams.push(`otp_uri=${registerResponseData?.otp_uri}`);
    }
    if (registerResponseData?.verify_email) {
      loginParams.push(`verify_email=true`);
    }
    if (registerResponseData?.verify_sms) {
      loginParams.push(`verify_sms=true`);
    }
    if ([200, 201].includes(registerResponse?.status || 500)) {
      router.push(loginParams.length > 0 ? `/user/login?${loginParams.join('&')}` : '/user/login');
    } else {
      console.error('AUTH NO WORK HELP');
    }
  };
  useEffect(() => {
    // To-Do Assert that there are no dupes or empty strings in additionalFields (after trimming and lowercasing)
  }, [additionalFields]);
  useEffect(() => {
    if (getCookie('invitation')) {
      setInvite(getCookie('company') || '');
    }
  }, []);
  useEffect(() => {
    if (!submitted && formRef.current && additionalFields.length === 0) {
      setSubmitted(true);
      formRef.current.requestSubmit();
    }
  }, []);
  const [invite, setInvite] = useState<string | null>(null);
  const showEmail = process.env.NEXT_PUBLIC_ALLOW_EMAIL_SIGN_IN === 'true';
  return (
    <div className={additionalFields.length === 0 && showEmail ? ' invisible' : ''}>
      <AuthCard
        title={invite !== null ? 'Accept Invitation to ' + (invite.replaceAll('+', ' ') || 'Company') : 'Sign Up'}
        description={`Welcome, please complete your registration. ${invite !== null ? 'You are ' : ''}${invite ? ' to ' + invite.replaceAll('+', ' ') + '.' : ''}${invite !== null ? '.' : ''}`}
        showBackButton
      >
        <form onSubmit={submitForm} className='flex flex-col gap-4' ref={formRef}>
          <input type='hidden' id='email' name='email' value={getCookie('email')} />
          {additionalFields.length > 0 &&
            additionalFields.map((field) => (
              <div key={field} className='space-y-1'>
                <Label htmlFor={field}>{toTitleCase(field)}</Label>
                <Input key={field} id={field} name={field} type='text' required placeholder={toTitleCase(field)} />
              </div>
            ))}
          {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
            <div
              style={{
                margin: '0.8rem 0',
              }}
            >
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                onChange={(token: string | null) => {
                  setCaptcha(token);
                }}
              />
            </div>
          )}
          <Button type='submit'>Register</Button>
          {responseMessage && <AuthCard.ResponseMessage>{responseMessage}</AuthCard.ResponseMessage>}
        </form>
        {invite && <OAuth />}
      </AuthCard>
    </div>
  );
}
