import { BirthdayCardApp } from './app/BirthdayCardApp';
import './styles/global.css';
import './styles/card.css';
import './styles/letter.css';
import './styles/responsive.css';

const root = document.querySelector<HTMLElement>('#app');

if (!root) throw new Error('无法找到 #app 根节点');

new BirthdayCardApp(root);
