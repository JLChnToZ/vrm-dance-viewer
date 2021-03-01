import i18next from 'i18next';
import { parseLink } from '../utils/link-parser';
import h from 'hyperscript';
import { VRMMeta, VRMSchema } from '@pixiv/three-vrm';
import workerService from './worker-service';
import { showModel as triggerShowModal } from '../utils/tocas-helpers';
import { arrayBufferToObjectUrl } from '../utils/helper-functions';

const copyrightRegex = /^\s*(©|\([Cc]\)|\[[Cc]\])/;

let hasMeta = false;
let autoShown = true;

interface LicenseMeta {
  badgeUrl?: string;
  linkUrl?: string;
  redistrube?: boolean;
  attribution?: boolean;
  modify?: boolean;
}

const licenseMetaMap: { [key in VRMSchema.MetaLicenseName]: LicenseMeta } = {
  CC0: {
    linkUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    badgeUrl: 'https://licensebuttons.net/l/zero/1.0/88x15.png',
    redistrube: true,
    attribution: false,
    modify: true,
  },
  CC_BY: {
    linkUrl: 'https://creativecommons.org/licenses/by/4.0/',
    badgeUrl: 'https://licensebuttons.net/l/by/4.0/80x15.png',
    redistrube: true,
    attribution: true,
    modify: true,
  },
  CC_BY_NC: {
    linkUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    badgeUrl: 'https://licensebuttons.net/l/by-nc/4.0/80x15.png',
    redistrube: true,
    attribution: true,
    modify: true,
  },
  CC_BY_NC_ND: {
    linkUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    badgeUrl: 'https://licensebuttons.net/l/by-nc-nd/4.0/80x15.png',
    redistrube: true,
    attribution: true,
    modify: false,
  },
  CC_BY_NC_SA: {
    linkUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    badgeUrl: 'https://licensebuttons.net/l/by-nc-sa/4.0/80x15.png',
    redistrube: true,
    attribution: true,
    modify: true,
  },
  CC_BY_ND: {
    linkUrl: 'https://creativecommons.org/licenses/by-nd/4.0/',
    badgeUrl: 'https://licensebuttons.net/l/by-nd/4.0/80x15.png',
    redistrube: true,
    attribution: true,
    modify: false,
  },
  CC_BY_SA: {
    linkUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    badgeUrl: 'https://licensebuttons.net/l/by-sa/4.0/80x15.png',
    redistrube: true,
    attribution: true,
    modify: true,
  },
  Other: {},
  Redistribution_Prohibited: {
    redistrube: false,
  },
};

export function displayMeta(meta: VRMMeta | null | undefined) {
  const credits = document.querySelector<HTMLElement>('.credits');
  if (!credits) return;
  delete credits.dataset.lang;
  credits.textContent = '';
  if (!meta) return;
  credits.appendChild(h('span',
    meta.title,
    meta.version ? i18next.t('version', meta) : undefined,
    meta.author ? i18next.t('author', { author: formatCopyright(meta.author) }) : undefined,
    (!meta.title && !meta.version && !meta.author) ? i18next.t('unknown_model_info') : undefined,
    '. ',
    getLicenseBlock(meta),
  ));
  prepareModel(meta);
  document.title = `${meta.title || i18next.t('unknown_model')} - ${i18next.t('appName')}`;
  setIcon(meta.texture as any);
}

function setIcon(icon?: Blob | BlobPart | string | null) {
  const metaElement =
    document.querySelector<HTMLLinkElement>('link[rel=icon]') ??
    document.head.appendChild(h('link', { rel: 'icon' }));
  const { dataset } = metaElement;
  if (!dataset.defaultHref)
    dataset.defaultHref = metaElement.href || 'about:blank';
  else if (metaElement.href.startsWith('blob:'))
    URL.revokeObjectURL(metaElement.href);
  if (typeof icon === 'string')
    metaElement.href = icon;
  else if (icon instanceof Blob)
    metaElement.href = URL.createObjectURL(icon);
  else if (icon != null)
    metaElement.href = arrayBufferToObjectUrl(icon);
  else
    metaElement.href = dataset.defaultHref || 'about:blank';
}

export function showMoreInfo() {
  if (hasMeta) triggerShowModal(document.querySelector<HTMLDialogElement>('#dialogmodal')!);
}

export function setAutoShown(newState: boolean) {
  autoShown = newState;
}

function formatCopyright(author?: string) {
  return author ? copyrightRegex.test(author) ? author : `© ${author}` : '';
}

function getLicenseBlock(meta: VRMMeta) {
  if (!meta.licenseName) return;
  const license = licenseMetaMap[meta.licenseName];
  const content = license.badgeUrl ? h('img.ts.middle.aligned.image', {
    src: license.badgeUrl,
    alt: i18next.t(`License_${meta.licenseName}`),
  }) : i18next.t(`License_${meta.licenseName}`);
  const linkUrl = meta.otherLicenseUrl || license.linkUrl;
  return linkUrl ? h('a', {
    href: linkUrl,
    target: '_blank',
  }, content) : content;
}

function prepareModel(meta: VRMMeta) {
  const modal = document.querySelector<HTMLDialogElement>('#dialogmodal')!;
  const header = modal.querySelector('.header')!;
  let title = meta.title || '';
  if (meta.version) title += i18next.t('version', meta);
  header.textContent = i18next.t('mata_title', { title });
  const body = modal.querySelector('.content')!;
  let content = body;
  body.textContent = '';
  if (meta.texture) {
    body.classList.add('image');
    content = body.appendChild(h('div.description'));
    body.appendChild(
      h('div.ts.medium.rounded.image',
        h('img', {
          src: arrayBufferToObjectUrl(meta.texture as any),
          onload: (e: Event) => URL.revokeObjectURL((e.target as HTMLImageElement).src),
        }),
      ),
    );
  } else
    body.classList.remove('image');
  const license = meta.licenseName ? licenseMetaMap[meta.licenseName] : undefined;
  content.appendChild(
    h('div.ts.list',
      h('div.item',
        h('div.content',
          h('div.header', formatCopyright(meta.author) || i18next.t('default_author_header')),
          ...parseLink(meta.contactInformation),
          h('br'),
          getLicenseBlock(meta),
        ),
      ),
      meta.reference ?
        h('div.item',
          h('div.content',
            h('div.header', i18next.t('reference')),
            ...parseLink(meta.reference),
          ),
        ) :
        undefined,
      h('div.item',
        h('div.content',
          h('div.header', i18next.t('permissions')),
          h('div.ts.three.column.relaxed.grid',
            meta.allowedUserName ?
              h('div.center.aligned.column',
                getAllowUserIcon(meta.allowedUserName),
                h('label', i18next.t('allowedUser', { state: `Meta_${meta.allowedUserName}` })),
              ) :
              undefined,
            meta.sexualUssageName ?
              h('div.center.aligned.column',
                h('i.big.fitted.icons',
                  h('i.venus.mars.circular.icon'),
                  getMetaUsageIcon(meta.sexualUssageName)
                ),
                h('label', i18next.t('sexualUssage', { state: `Meta_${meta.sexualUssageName}` })),
              ) :
              undefined,
            meta.violentUssageName ?
              h('div.center.aligned.column',
                h('i.big.fitted.icons',
                  h('i.bomb.circular.icon'),
                  getMetaUsageIcon(meta.violentUssageName)
                ),
                h('label', i18next.t('violentUssage', { state: `Meta_${meta.violentUssageName}` })),
              ) :
              undefined,
            meta.commercialUssageName ?
              h('div.center.aligned.column',
                h('i.big.fitted.icons',
                  h('i.dollar.circular.icon'),
                  getMetaUsageIcon(meta.commercialUssageName)
                ),
                h('label', i18next.t('commercialUssage', { state: `Meta_${meta.commercialUssageName}` })),
              ) :
              undefined,
            license?.redistrube != null ?
              h('div.center.aligned.column',
                h('i.big.fitted.icons',
                  h('i.cloud.upload.circular.icon'),
                  getMetaUsageIcon(license.redistrube)
                ),
                h('label', i18next.t('redistrube', { state: `Meta_${license.redistrube ? 'Allow' : 'Disallow'}` })),
              ) :
              undefined,
            license?.modify != null ?
              h('div.center.aligned.column',
                h('i.big.fitted.icons',
                  h('i.paint.brush.circular.icon'),
                  getMetaUsageIcon(license.modify)
                ),
                h('label', i18next.t('modify', { state: `Meta_${license.modify ? 'Allow' : 'Disallow'}` })),
              ) :
              undefined,
            license?.attribution != null ?
              h('div.center.aligned.column',
                h('i.big.fitted.icons',
                  h('i.quote.right.circular.icon'),
                  license.attribution ?
                    h('i.corner.info.caution.icon') :
                    h('i.corner.disabled.radio.icon')
                ),
                h('label', i18next.t('attribution', { state: `Attribution_${license.attribution ? 'Yes' : 'No'}` })),
              ) :
              undefined,
            meta.otherPermissionUrl ?
              h('div.center.aligned.column',
                h('a', {
                  href: meta.otherPermissionUrl,
                  target: '_blank'
                },
                  h('i.big.fitted.external.circular.icon'),
                  h('label', i18next.t('otherPermission')),
                ),
              ) :
              undefined,
          ),
        ),
      ),
    ),
  );
  hasMeta = true;
  if (autoShown) triggerShowModal(modal);
}

function getMetaUsageIcon(usage: VRMSchema.MetaUssageName | boolean) {
  switch(usage) {
    case 'Allow': case true: return h('i.corner.positive.check.icon');
    case 'Disallow': case false: return h('i.corner.negative.dont.icon');
    default: return h('i.corner.question.icon');
  }
}

function getAllowUserIcon(user: VRMSchema.MetaAllowedUserName) {
  switch(user) {
    case 'Everyone': return h('i.big.fitted.globe.circular.icon');
    case 'ExplicitlyLicensedPerson': return h('i.big.fitted.users.circular.icon');
    case 'OnlyAuthor': return h('i.big.fitted.lock.circular.icon');
    default: return h('i.big.fitted.question.circular.icon');
  }
}

workerService.on({ displayMeta });
