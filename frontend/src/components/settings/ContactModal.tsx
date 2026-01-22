import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Modal, Button, Input, TextArea } from '@/components/common';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
    setIsSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="お問い合わせ" size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Contact Info */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Mail className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">メール</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                support@example.com
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">電話</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                03-1234-5678
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">所在地</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                〒150-0001 東京都渋谷区神宮前1-2-3
              </p>
            </div>
          </div>
        </div>

        {/* Support Hours */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              サポート対応時間
            </p>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            平日 9:00 - 18:00（土日祝日・年末年始を除く）
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            通常、1-2営業日以内にご返信いたします
          </p>
        </div>

        {/* Contact Form */}
        {isSubmitted ? (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              お問い合わせを受け付けました
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              ご連絡ありがとうございます。担当者より折り返しご連絡いたします。
            </p>
            <Button variant="outline" onClick={resetForm} className="mt-4">
              新しいお問い合わせを送信
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              お問い合わせフォーム
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="お名前"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="山田 太郎"
              />
              <Input
                label="メールアドレス"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="example@email.com"
              />
            </div>

            <Input
              label="件名"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              placeholder="お問い合わせの件名"
            />

            <TextArea
              label="お問い合わせ内容"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              placeholder="お問い合わせ内容をご記入ください"
              rows={4}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    送信
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
