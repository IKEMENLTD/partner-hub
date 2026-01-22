import { Modal, Button } from '@/components/common';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="プライバシーポリシー" size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          最終更新日: 2026年1月1日
        </div>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            はじめに
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            当社（以下「当社」といいます）は、お客様のプライバシーを尊重し、個人情報の保護に努めております。
            本プライバシーポリシーは、当社が提供するプロジェクト管理サービス（以下「本サービス」といいます）における
            個人情報の取り扱いについて説明するものです。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            1. 収集する情報
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>当社は、以下の情報を収集する場合があります。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>アカウント情報:</strong> 氏名、メールアドレス、パスワード、会社名、部署名など
              </li>
              <li>
                <strong>利用情報:</strong> 本サービスの利用状況、アクセスログ、操作履歴など
              </li>
              <li>
                <strong>デバイス情報:</strong> IPアドレス、ブラウザの種類、オペレーティングシステムなど
              </li>
              <li>
                <strong>コンテンツ情報:</strong> プロジェクト、タスク、コメント、アップロードされたファイルなど
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            2. 情報の利用目的
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p className="mb-2">当社は、収集した情報を以下の目的で利用します。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスの提供、維持、改善</li>
              <li>ユーザー認証およびアカウント管理</li>
              <li>カスタマーサポートの提供</li>
              <li>本サービスに関するお知らせや更新情報の送信</li>
              <li>利用状況の分析およびサービス改善のための統計データの作成</li>
              <li>不正利用の防止およびセキュリティの確保</li>
              <li>法的要件への対応</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            3. 情報の共有
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              当社は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>お客様の同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>
                本サービスの提供に必要な範囲で業務委託先に提供する場合（適切な管理監督のもとで行います）
              </li>
              <li>合併、会社分割、事業譲渡その他の事由による事業の承継に伴う場合</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            4. データセキュリティ
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              当社は、お客様の個人情報を適切に保護するため、以下のセキュリティ対策を講じています。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>SSL/TLS暗号化による通信の保護</li>
              <li>データの暗号化保存</li>
              <li>アクセス制御およびログ監視</li>
              <li>定期的なセキュリティ監査</li>
              <li>従業員に対するセキュリティ教育</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            5. Cookieの使用
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              当社は、本サービスにおいてCookieおよび類似の技術を使用しています。Cookieは以下の目的で使用されます。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>ユーザー認証およびセッション管理</li>
              <li>ユーザー設定の保存</li>
              <li>サービスの利用状況の分析</li>
            </ul>
            <p>
              お客様はブラウザの設定によりCookieを無効にすることができますが、一部の機能が利用できなくなる場合があります。
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            6. データの保存期間
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            当社は、お客様の個人情報を、利用目的の達成に必要な期間保存します。
            アカウントが削除された場合、個人情報は合理的な期間内に削除または匿名化されます。
            ただし、法令により保存が義務付けられている場合はこの限りではありません。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            7. お客様の権利
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p className="mb-2">お客様は、ご自身の個人情報に関して以下の権利を有します。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>アクセス権:</strong> 当社が保有するお客様の個人情報へのアクセスを求める権利
              </li>
              <li>
                <strong>訂正権:</strong> 不正確な個人情報の訂正を求める権利
              </li>
              <li>
                <strong>削除権:</strong> 個人情報の削除を求める権利
              </li>
              <li>
                <strong>データポータビリティ:</strong> 個人情報を構造化された形式で受け取る権利
              </li>
              <li>
                <strong>異議申立権:</strong> 特定の処理に対して異議を申し立てる権利
              </li>
            </ul>
            <p className="mt-2">
              これらの権利を行使する場合は、お問い合わせ窓口までご連絡ください。
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            8. 子どものプライバシー
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            本サービスは、16歳未満のお子様を対象としておりません。当社は、16歳未満のお子様から
            意図的に個人情報を収集することはありません。16歳未満のお子様の個人情報が収集されていることが
            判明した場合、速やかに削除いたします。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            9. プライバシーポリシーの変更
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            当社は、必要に応じて本プライバシーポリシーを変更することがあります。
            重要な変更がある場合は、本サービス上での通知またはメールにてお知らせいたします。
            変更後も本サービスを継続してご利用いただく場合、変更後のプライバシーポリシーに
            同意いただいたものとみなします。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            10. お問い合わせ
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p className="mb-2">
              本プライバシーポリシーに関するご質問やお問い合わせは、以下の窓口までご連絡ください。
            </p>
            <div className="rounded-lg bg-gray-50 dark:bg-slate-700 p-4 space-y-1">
              <p>
                <strong>個人情報保護管理者:</strong> 情報セキュリティ部
              </p>
              <p>
                <strong>メールアドレス:</strong> privacy@example.com
              </p>
              <p>
                <strong>住所:</strong> 東京都渋谷区〇〇1-2-3
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end border-t border-gray-200 dark:border-slate-700 pt-4">
        <Button variant="outline" onClick={onClose}>
          閉じる
        </Button>
      </div>
    </Modal>
  );
}
