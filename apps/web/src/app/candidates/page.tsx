import { CandidateList } from './CandidateList';

import { buildCandidatesListPath } from './candidateNavigation';

import { getCandidates, LIST_PAGE_SIZE } from '@/lib/api';

import { FilterListLayout } from '@/components/filters/FilterListLayout';

import { ListFilterPanel } from '@/components/filters/ListFilterPanel';

import { PageHeader } from '@/components/ui/PageHeader';

import { EmptyState } from '@/components/ui/EmptyState';

import { Alert } from '@/components/ui/Alert';



export const dynamic = 'force-dynamic';



export default async function CandidatesPage({

  searchParams,

}: {

  searchParams: Promise<{ category?: string; country?: string; language?: string }>;

}) {

  const { category, country, language } = await searchParams;

  const listPath = buildCandidatesListPath({ category, country, language });



  let data: Awaited<ReturnType<typeof getCandidates>> | null = null;

  let error: string | null = null;



  try {

    data = await getCandidates({

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

        title="候选热点池"

        description="系统自动发现的候选事件，可手动加入关注或归档"

        bordered={false}

        className="mb-0"

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

              total={data.total}

            />

          }

        >

          {data.candidates.length === 0 && (

            <EmptyState

              title={hasFilters ? '没有匹配的候选' : '暂无候选热点'}

              description={

                hasFilters

                  ? '尝试调整筛选条件，或清除筛选查看全部候选'

                  : '请先运行数据采集任务，系统将自动发现候选事件'

              }

            />

          )}



          {data.candidates.length > 0 && (

            <CandidateList

              candidates={data.candidates}

              total={data.total}

              listPath={listPath}

              filters={{ category, country, language }}

            />

          )}

        </FilterListLayout>

      )}

    </div>

  );

}

