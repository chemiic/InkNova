import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { isArticleVisible } from '@inknova/shared';
import { DatabaseService } from '../database/database.service';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  list() {
    return this.db.listArticles().filter(isArticleVisible);
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    const article = this.db.findArticleBySlug(slug);
    if (!article || !isArticleVisible(article)) {
      throw new NotFoundException(`Article not found: ${slug}`);
    }
    return article;
  }
}
