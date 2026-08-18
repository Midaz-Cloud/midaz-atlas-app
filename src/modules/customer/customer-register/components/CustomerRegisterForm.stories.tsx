import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';

import { withI18nStorybook } from '@shared/i18n/I18nStorybookDecorator';

import { CustomerRegisterForm } from './CustomerRegisterForm';

const meta = {
  title: 'Modules/Customer/CustomerRegisterForm',
  component: CustomerRegisterForm,
  decorators: [withI18nStorybook],
  args: {
    isJuridico: false,
    requireEmail: false,
    firstName: '',
    lastName: '',
    email: '',
    phoneOperatorCode: '414',
    phoneSubscriberNumber: '',
    firstNameLabel: 'Nombre',
    lastNameLabel: 'Apellido',
    businessNameLabel: 'Razón social',
    emailLabel: 'Correo electrónico',
    phoneSubscriberPlaceholder: 'Ingresa tu número de teléfono',
    onFirstNameChange: fn(),
    onLastNameChange: fn(),
    onEmailChange: fn(),
    onPhoneOperatorChange: fn(),
    onPhoneSubscriberChange: fn(),
  },
} satisfies Meta<typeof CustomerRegisterForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const NaturalFilled: Story = {
  args: {
    firstName: 'Juan',
    lastName: 'Pérez',
    phoneOperatorCode: '414',
    phoneSubscriberNumber: '1234567',
  },
};

export const NaturalWithEmail: Story = {
  args: {
    requireEmail: true,
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan.perez@correo.com',
    phoneOperatorCode: '414',
    phoneSubscriberNumber: '1234567',
  },
};

export const JuridicoEmpty: Story = {
  args: {
    isJuridico: true,
  },
};

export const JuridicoFilled: Story = {
  args: {
    isJuridico: true,
    firstName: 'Acme C.A.',
    phoneOperatorCode: '414',
    phoneSubscriberNumber: '1234567',
  },
};
