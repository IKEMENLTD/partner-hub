import { Modal } from '@/components/common';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="利用規約" size="lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          最終更新日: 2026年1月1日
        </div>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第1条（適用）
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            本利用規約（以下「本規約」といいます）は、当社が提供するプロジェクト管理サービス（以下「本サービス」といいます）の利用条件を定めるものです。
            登録ユーザーの皆さま（以下「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第2条（利用登録）
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              1. 本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、
              当社がこれを承認することによって、利用登録が完了するものとします。
            </p>
            <p>
              2. 当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、
              その理由については一切の開示義務を負わないものとします。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
              <li>本規約に違反したことがある者からの申請である場合</li>
              <li>その他、当社が利用登録を相当でないと判断した場合</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第3条（ユーザーIDおよびパスワードの管理）
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              1. ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。
            </p>
            <p>
              2. ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、
              もしくは第三者と共用することはできません。
            </p>
            <p>
              3. 当社は、ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、
              そのユーザーIDを登録しているユーザー自身による利用とみなします。
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第4条（禁止事項）
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <p className="mb-2">
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
              <li>当社、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
              <li>本サービスによって得られた情報を商業的に利用する行為</li>
              <li>当社のサービスの運営を妨害するおそれのある行為</li>
              <li>不正アクセスをし、またはこれを試みる行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>不正な目的を持って本サービスを利用する行為</li>
              <li>本サービスの他のユーザーまたはその他の第三者に不利益、損害、不快感を与える行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>当社が許諾しない本サービス上での宣伝、広告、勧誘、または営業行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第5条（本サービスの提供の停止等）
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              1. 当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
              <li>コンピュータまたは通信回線等が事故により停止した場合</li>
              <li>その他、当社が本サービスの提供が困難と判断した場合</li>
            </ul>
            <p>
              2. 当社は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第6条（著作権）
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              1. ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像や映像等の情報に関してのみ、本サービスを利用し、投稿ないしアップロードすることができるものとします。
            </p>
            <p>
              2. ユーザーが本サービスを利用して投稿ないしアップロードした文章、画像、映像等の著作権については、当該ユーザーその他既存の権利者に留保されるものとします。
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第7条（免責事項）
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>
              1. 当社の債務不履行責任は、当社の故意または重過失によらない場合には免責されるものとします。
            </p>
            <p>
              2. 当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第8条（サービス内容の変更等）
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、
            これによってユーザーに生じた損害について一切の責任を負いません。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第9条（利用規約の変更）
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
            なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            第10条（準拠法・裁判管轄）
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
            <p>1. 本規約の解釈にあたっては、日本法を準拠法とします。</p>
            <p>
              2. 本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </div>
        </section>
      </div>
    </Modal>
  );
}
