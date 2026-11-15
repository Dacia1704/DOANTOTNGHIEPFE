import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiResponse } from '@model/api-response';
import { CommunityMapper } from '@model/community/community.mapper';
import {
  CommunityPostResponse,
  CommunityCommentResponse,
} from '@model/community/response/community-response';
import {
  CommunityPostRequest,
  CommunityCommentRequest,
} from '@model/community/request/community-request';
import {
  CommunitySlice,
  CommunityMedia,
  CommunityListing,
  Reaction,
} from '@model/community/community.model';

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/community`;
  feed(tab = 'LATEST', cursor = '', q = '', area = '') {
    const params = new HttpParams()
      .set('tab', tab)
      .set('cursor', cursor)
      .set('q', q)
      .set('area', area);
    return this.http
      .get<ApiResponse<CommunitySlice<CommunityPostResponse>>>(`${this.api}/feed`, { params })
      .pipe(map(({ data }) => ({ ...data, items: data.items.map(CommunityMapper.post) })));
  }
  listingChoices(q: string) {
    return this.http
      .get<ApiResponse<CommunityListing[]>>(`${this.api}/listings`, { params: { q } })
      .pipe(map((r) => r.data));
  }
  post(id: string) {
    return this.http
      .get<ApiResponse<CommunityPostResponse>>(`${this.api}/posts/${id}`)
      .pipe(map(({ data }) => CommunityMapper.post(data)));
  }
  savePost(body: CommunityPostRequest, id?: string) {
    const result = id
      ? this.http.put<ApiResponse<CommunityPostResponse>>(`${this.api}/posts/${id}`, body)
      : this.http.post<ApiResponse<CommunityPostResponse>>(`${this.api}/posts`, body);
    return result.pipe(map(({ data }) => CommunityMapper.post(data)));
  }
  deletePost(id: string) {
    return this.http.delete(`${this.api}/posts/${id}`);
  }
  upload(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<ApiResponse<CommunityMedia>>(`${this.api}/media`, body)
      .pipe(map((r) => r.data));
  }
  comments(post: string, parent = '', cursor = '') {
    let params = new HttpParams();
    if (parent) params = params.set('parent', parent);
    if (cursor) params = params.set('cursor', cursor);
    return this.http
      .get<ApiResponse<CommunitySlice<CommunityCommentResponse>>>(
        `${this.api}/posts/${post}/comments`,
        { params },
      )
      .pipe(map(({ data }) => ({ ...data, items: data.items.map(CommunityMapper.comment) })));
  }
  comment(post: string, body: CommunityCommentRequest, id?: string) {
    const result = id
      ? this.http.put<ApiResponse<CommunityCommentResponse>>(
          `${this.api}/posts/${post}/comments/${id}`,
          body,
        )
      : this.http.post<ApiResponse<CommunityCommentResponse>>(
          `${this.api}/posts/${post}/comments`,
          body,
        );
    return result.pipe(map(({ data }) => CommunityMapper.comment(data)));
  }
  deleteComment(id: string) {
    return this.http.delete(`${this.api}/comments/${id}`);
  }
  reaction(type: string, id: string, reaction: Reaction | null) {
    const url = `${this.api}/content/${type}/${id}/reaction`;
    return reaction ? this.http.put(url, { type: reaction }) : this.http.delete(url);
  }
  bookmark(id: string, saved: boolean) {
    const url = `${this.api}/posts/${id}/save`;
    return saved ? this.http.put(url, {}) : this.http.delete(url);
  }
  follow(id: string, followed: boolean) {
    const url = `${this.api}/users/${id}/follow`;
    return followed ? this.http.put(url, {}) : this.http.delete(url);
  }
  report(type: string, id: string, reason: string) {
    return this.http.post(`${this.api}/content/${type}/${id}/report`, { reason });
  }
  reveal(type: string, id: string) {
    return this.http
      .post<ApiResponse<string>>(`${this.api}/content/${type}/${id}/reveal`, {})
      .pipe(map((r) => r.data));
  }
  appeal(id: string, reason: string) {
    return this.http.post(`${this.api}/posts/${id}/appeal`, { reason });
  }
  pin(id: string, pinned: boolean) {
    return this.http.put(`${this.api}/posts/${id}/pin`, {}, { params: { pinned } });
  }
}
