import { CandidateList } from './CandidateList';

import { buildCandidatesListPath } from './candidateNavigation';

import { getCandidates, LIST_PAGE_SIZE } from '@/lib/api';

import { FilterListLayout } from '@/components/filters/FilterListLayout';

import { ListFilterPanel } from '@/components/filters/ListFilterPanel';

import { PageHeader } from '@/components/ui/PageHeader';

import { EmptyState } from '@/components/ui/EmptyState';

import { Alert } from '@/components/ui/Alert';



export const dynamic = 'force-dynamic';

const SORT_OPTIONS = [
  { value: 'heat', label: '按热度' },
  { value: 'recent', label: '最新发现' },
  { value: 'updated', label: '最近更新' },
] as const;



export default async function CandidatesPage({

  searchParams,

}: {

  searchParams: Promise<{ category?: string; country?: string; language?: string; sort?: string }>;

}) {

  const { category, country, language, sort: sortParam } = await searchParams;
  const sort = sortParam ?? 'heat';

  const listPath = buildCandidatesListPath({ category, country, language, sort });



  let data: Awaited<ReturnType<typeof getCandidates>> | null = null;

  let error: string | null = null;



  try {

    data = await getCandidates({

      sort,

      category,

      country,

      language,

      limit: LIST_PAGE_SIZE,

      offset: 0,

    });

  } catch (e) {

    error = e instanceof Error ? e.message : '加载失败';

  }



  const hasFilters = Boolean(category || country || language);



  return (

    <div className="min-w-0 space-y-4">

      <PageHeader
        variant="playful"
        eyebrow="好苗子都在这里"
        title="候选热点池"
        description="系统自动发现的候选事件，挑几个加入关注，或者先放着观察也行。"
        stats={[
          { label: '候选总数', value: data?.total ?? '-', accent: 'brand' },
          { label: '当前筛选', value: hasFilters ? '已开启' : '全部', accent: 'orange' },
        ]}
      />



      {error && <Alert variant="warning">{error}</Alert>}



      {data && (

        <FilterListLayout

          sidebar={

            <ListFilterPanel

              basePath="/candidates"

              categories={data.facets.categories}

              countries={data.facets.countries}

              languages={data.facets.languages}

              activeCategory={category}

              activeCountry={country}

              activeLanguage={language}

              activeSort={sort}

              sortOptions={[...SORT_OPTIONS]}

              total={data.total}

            />

          }

        >

          {data.candidates.length === 0 && (

            <EmptyState

              title={hasFilters ? '没有匹配的候选' : '暂无候选热点'}

              description={

                hasFilters

                  ? '筛选条件可能太严了，放宽一点说不定有惊喜'

                  : '跑一轮采集后，系统会自动把新发现的事件丢进这里'

              }

            />

          )}



          {data.candidates.length > 0 && (

            <CandidateList

              candidates={data.candidates}

              total={data.total}

              listPath={listPath}

              sort={sort}

              filters={{ category, country, language }}

            />

          )}

        </FilterListLayout>

      )}

    </div>

  );

}

